# Deploy ขึ้น VPS (147.50.255.198)

**URL ปลายทาง: `https://line.espaengineering.com`**

เลือก subdomain ไม่ใช่ subpath เพราะแอปเขียนผูกกับ root ทั้งหมด
(`res.redirect('/...')` 24 จุด, `<form action="/...">` 19 จุด) การย้ายไปอยู่ใต้ `/line-workflow`
ต้องแก้โค้ดราว 30 จุด และต้องแก้ vhost ของเว็บที่ live อยู่

> เอกสารใน `../README.md` และ `../render.yaml` เขียนไว้สำหรับ **Render + Neon** ซึ่งเป็นคนละวิธี
> ถ้า deploy ลง VPS ตัวนี้ให้ใช้ไฟล์นี้

---

## สภาพเครื่องปลายทาง (สำรวจจริงผ่าน SSH เมื่อ 16 ส.ค. 2026)

| รายการ | สถานะ |
|---|---|
| OS | Ubuntu 24.04.4 LTS |
| ทรัพยากร | RAM 3.8 Gi (ว่าง 2.5 Gi) · ดิสก์ 40 G (ว่าง 14 G) · uptime 53 วัน |
| Docker | ✅ 29.6.0 |
| certbot | ✅ 2.9.0 |
| **Node / npm** | ❌ **ไม่มีบน host** |
| **PostgreSQL** | ❌ **ไม่มีบน host** |
| pm2 | ❌ ไม่มี |
| nginx | ✅ 1.24.0 (Ubuntu) รันบน host |
| DNS | ✅ wildcard `*.espaengineering.com` → 147.50.255.198 (`line.` ใช้ได้ทันที) |
| ใบรับรองปัจจุบัน | ครอบคลุมแค่ `espaengineering.com` + `www.` → **`line.` ต้องออกใบใหม่** |

### รูปแบบที่เครื่องนี้ใช้อยู่ — ต้องทำตาม

เว็บบริษัทรันด้วย Docker Compose ที่ `/opt/espa/apps/website/` ประกอบด้วย
frontend (Next.js) + backend (FastAPI) + postgres:16-alpine ทุก container
publish port ที่ `127.0.0.1` เท่านั้น แล้ว nginx บน host proxy เข้าไป

```
/etc/nginx/conf.d/espaengineering.com.conf   → 127.0.0.1:3000 (frontend), 127.0.0.1:8000 (/api/)
/etc/nginx/sites-enabled/espa                → static บน port 80 (server_name _)
```

**เครื่องนี้ไม่ใช่เครื่องเปล่า** ทุกขั้นตอนต้องเป็นการ *เพิ่ม* ไม่ใช่ *แทนที่*
เราจึงลง Docker Compose แยกสแตกของตัวเอง **ไม่ติดตั้ง Node/PostgreSQL ลง host**
และใช้ network ของตัวเอง ไม่ต่อเข้า `espa-network` เพื่อไม่ให้สองระบบมองเห็น DB ของกันและกัน

| | เว็บบริษัท (มีอยู่แล้ว) | LINE Workflow (ที่จะเพิ่ม) |
|---|---|---|
| โฟลเดอร์ | `/opt/espa/apps/website/` | `/opt/espa/apps/line-workflow/` |
| port ภายใน | 3000, 8000 | **3500** (ว่างอยู่ ตรวจแล้ว) |
| network | `espa-network` | `line-workflow-network` |
| nginx | `conf.d/espaengineering.com.conf` | `conf.d/line.espaengineering.com.conf` (ไฟล์ใหม่) |

---

## ขั้นที่ 1 — วางโค้ดบนเซิร์ฟเวอร์

> ⚠️ **ห้าม deploy จาก `main`** — repo ต้นทางเป็น repo สอน `main` คือ starter
> "Express Hello World" 6 ไฟล์ ที่ผู้เรียนใช้ clone ตอนเริ่มเวิร์กช็อป ไม่ใช่โค้ดแอป
> โค้ดจริงอยู่บน `day2` (60 ไฟล์) และ deploy จาก branch **`production`** ที่แยกออกมาจาก `day2`

deploy จาก fork `sa-ngob/line-workflow-app` (public จึง clone ได้เลย ไม่ต้องตั้ง deploy key)

```bash
ssh root@147.50.255.198
mkdir -p /opt/espa/apps
cd /opt/espa/apps
git clone -b production https://github.com/sa-ngob/line-workflow-app.git line-workflow
cd line-workflow
```

## ขั้นที่ 2 — ตั้งค่า .env

```bash
cp deploy/.env.production.example .env
nano .env
chmod 600 .env
```

ค่าที่ต้องสร้าง (รันในเครื่องตัวเองหรือบนเซิร์ฟเวอร์ก็ได้):

```bash
openssl rand -base64 32     # -> POSTGRES_PASSWORD
openssl rand -base64 48     # -> SESSION_SECRET
npm run hash-password       # -> ADMIN_PASSWORD_HASH (รันในเครื่อง dev)
```

ตรวจก่อนไปต่อ — สี่ค่านี้ห้ามว่างและห้ามเป็นค่า default:
`POSTGRES_PASSWORD`, `SESSION_SECRET`, `ADMIN_PASSWORD_HASH`, `CHANNEL_ACCESS_TOKEN`
และ `MOCK_LINE` ต้องเป็น `false`

## ขั้นที่ 3 — build และรัน

```bash
cd /opt/espa/apps/line-workflow
docker compose -f deploy/docker-compose.prod.yml up -d --build
docker compose -f deploy/docker-compose.prod.yml ps      # ต้อง healthy ทั้งคู่
```

## ขั้นที่ 4 — สร้างตาราง

รันครั้งเดียวหลัง container ขึ้นแล้ว (`scripts/` ถูกคอมไพล์เป็น `dist/scripts/` ไปกับ image
จึงไม่ต้องพึ่ง tsx):

```bash
# --only=01 = สร้างเฉพาะ schema ไม่ใส่ข้อมูลจำลอง (production ไม่ควรมี seed ปลอม)
docker compose -f deploy/docker-compose.prod.yml exec app node dist/scripts/db-setup.js --only=01

# ตรวจว่าได้ 7 ตาราง + 3 view
docker compose -f deploy/docker-compose.prod.yml exec postgres \
  psql -U lineapp -d linechat -c "\dt" -c "\dv"
```

## ขั้นที่ 5 — ตรวจว่าแอปทำงานก่อนเปิดสู่ภายนอก

```bash
curl -s localhost:3500/health
# ต้องได้ {"status":"ok","messagesStored":0,"lineMode":"live"}
#                                            ^^^^ ถ้าขึ้น mock แปลว่า MOCK_LINE ยังไม่เป็น false
```

## ขั้นที่ 6 — nginx + TLS

```bash
# จากเครื่อง dev
scp deploy/nginx-line-workflow.conf \
    root@147.50.255.198:/etc/nginx/conf.d/line.espaengineering.com.conf

# บนเซิร์ฟเวอร์
nginx -t                      # ⚠️ ไม่ผ่านห้าม reload เด็ดขาด เว็บบริษัทจะล่มไปด้วย
systemctl reload nginx
certbot --nginx -d line.espaengineering.com
nginx -t && systemctl reload nginx
```

ตรวจ:

```bash
curl -s https://line.espaengineering.com/health
curl -sI https://line.espaengineering.com/ | head -3    # ต้องได้ 302 -> /login
```

## ขั้นที่ 7 — ตั้ง Webhook ใน LINE

ใส่ `https://line.espaengineering.com/webhook` ใน LINE Developers Console แล้วกด Verify
(เลิกใช้ ngrok `lair-saucy-unpopular.ngrok-free.dev` ได้แล้ว)

ยิงแบบไม่มีลายเซ็นต้องได้ **401** — ถ้าได้ 200 แปลว่า `CHANNEL_SECRET` ไม่ได้ถูกอ่าน:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "Content-Type: application/json" -d '{"events":[]}' \
  https://line.espaengineering.com/webhook
```

---

## อัปเดตเวอร์ชันใหม่

เมื่อพัฒนาบน `day2` เสร็จและอยากเอาขึ้น production:

remote บนเครื่อง dev ตั้งไว้สองตัว — `fork` = ของเรา (push ที่นี่), `origin` = ของอาจารย์ (ไว้ pull อย่างเดียว)

```bash
# เครื่อง dev
git checkout production && git merge day2 && git push fork production

# เซิร์ฟเวอร์
cd /opt/espa/apps/line-workflow
git pull
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

## ดู log

```bash
docker compose -f deploy/docker-compose.prod.yml logs -f app
tail -f /var/log/nginx/line-workflow.error.log
```

## สำรองข้อมูล

ตั้งอัตโนมัติไว้แล้ว ทำงานทุกวัน **19:15 UTC (02:15 น. ไทย)**

| ไฟล์ | ปลายทางบนเซิร์ฟเวอร์ |
|---|---|
| `deploy/backup-line-workflow.sh` | `/opt/espa/scripts/backup-line-workflow.sh` (700) |
| `deploy/espa-line-workflow-backup.cron` | `/etc/cron.d/espa-line-workflow-backup` (644) |

เก็บที่ `/opt/espa/backups/line-workflow/` แยกสองแบบตามธรรมชาติข้อมูล:

- **ฐานข้อมูล** → `pg_dump` บีบอัด เก็บย้อนหลัง 14 วัน (เขียนลง `.part` ก่อนแล้วค่อยเปลี่ยนชื่อ ถ้าพังกลางคันจะไม่เหลือไฟล์ที่ดูสมบูรณ์แต่กู้ไม่ได้)
- **ไฟล์สื่อ** → `rsync` แบบเพิ่มอย่างเดียว **ไม่ใส่ `--delete`** ไฟล์จาก LINE เขียนครั้งเดียวไม่แก้ซ้ำ การ tar ใหม่ทุกวันจะเปลืองที่เท่าจำนวนวันที่เก็บ และการไม่ลบตามต้นทางทำให้ไฟล์ที่ถูกลบพลาดยังกู้ได้ — LINE ลบต้นฉบับทิ้งเองหลังผ่านไประยะหนึ่ง ไม่มีที่อื่นให้กู้

มีตัวกันดิสก์เต็ม: ถ้าเหลือน้อยกว่า 2 GB จะไม่ยอมทำงาน (กันไม่ให้ backup ทำเว็บอื่นบนเครื่องล่ม)

```bash
# รันเองทันที
/opt/espa/scripts/backup-line-workflow.sh

# ดู log
tail -f /var/log/espa-line-workflow-backup.log
```

### กู้คืนฐานข้อมูล

```bash
f=$(ls -t /opt/espa/backups/line-workflow/postgres/linechat_*.sql.gz | head -1)
zcat "$f" | docker exec -i line-workflow-postgres psql -U lineapp -d linechat
docker restart line-workflow-app
```

### กู้คืนไฟล์สื่อ

```bash
vol=$(docker volume inspect line-workflow_line-workflow-media --format '{{.Mountpoint}}')
rsync -a /opt/espa/backups/line-workflow/media/ "$vol/"
```

## ถอนออกทั้งหมด (ถ้าต้องการ)

```bash
cd /opt/espa/apps/line-workflow
docker compose -f deploy/docker-compose.prod.yml down          # เก็บข้อมูลไว้
docker compose -f deploy/docker-compose.prod.yml down -v       # ลบข้อมูลด้วย
rm /etc/nginx/conf.d/line.espaengineering.com.conf
nginx -t && systemctl reload nginx
```
