# syntax=docker/dockerfile:1
# ==========================================================================
#  LINE Workflow Automation - production image
#  build:  docker compose -f deploy/docker-compose.prod.yml build
# ==========================================================================

# ---------- stage 1: build ----------
FROM node:22-alpine AS builder
WORKDIR /app

# ติดตั้ง dependency ทั้งหมด (รวม devDependencies เพราะต้องใช้ tsc)
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

# tsc คอมไพล์ทั้ง src/ และ scripts/ (ดู tsconfig.json include)
# แล้ว copy-views.mjs คัดลอกไฟล์ .ejs ไปที่ dist/src/views
RUN npm run build

# ---------- stage 2: runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Bangkok
RUN apk add --no-cache tzdata

# ลง dependency เฉพาะที่ใช้ตอนรัน ไม่เอา typescript/tsx ติดไปด้วย
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
# db-setup.js อ่านไฟล์ .sql จาก process.cwd()/sql ตอนรัน จึงต้องมีติดไปด้วย
COPY sql ./sql

# โฟลเดอร์ที่แอปต้องเขียนได้ (compose ผูก volume ทับอีกที)
RUN mkdir -p storage/media reports logs \
 && chown -R node:node /app

# ไม่รันด้วย root
USER node

EXPOSE 3500

# ใช้ /health ที่แอปมีอยู่แล้ว (src/index.ts:91) เป็นตัวบอกว่าต่อ DB ได้จริงไหม
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3500)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/src/index.js"]
