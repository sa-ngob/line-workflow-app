#!/usr/bin/env sh
# ==========================================================================
#  สำรองข้อมูล LINE Workflow
#  ติดตั้งที่ /opt/espa/scripts/backup-line-workflow.sh (chmod 700)
#  เรียกจาก /etc/cron.d/espa-line-workflow-backup
#
#  เขียนตามรูปแบบเดียวกับ backup-website-db.sh ที่มีอยู่บนเครื่องนี้แล้ว
#
#  สำรอง 2 อย่างด้วยวิธีต่างกัน เพราะธรรมชาติข้อมูลต่างกัน:
#
#  1) ฐานข้อมูล -> pg_dump บีบอัด เก็บย้อนหลัง 14 วัน
#     ข้อมูลเปลี่ยนตลอด ต้องมีหลายรุ่นให้ย้อนกลับได้
#
#  2) ไฟล์สื่อ -> rsync แบบ "เพิ่มอย่างเดียว" ไม่ใส่ --delete
#     ไฟล์จาก LINE เขียนครั้งเดียวไม่แก้ซ้ำ การ tar ใหม่ทุกวันจะเปลืองที่
#     เท่าจำนวนวันที่เก็บ ส่วน rsync ใช้ที่เท่าต้นฉบับชุดเดียว
#     และที่ไม่ใส่ --delete เพราะถ้าไฟล์ต้นทางถูกลบ (ตั้งใจหรือพลาด)
#     สำเนายังอยู่ -- LINE ลบไฟล์ต้นทางเองหลังผ่านไประยะหนึ่ง ไม่มีที่อื่นให้กู้
# ==========================================================================
set -eu

BACKUP_ROOT="${BACKUP_ROOT:-/opt/espa/backups/line-workflow}"
DB_DIR="${BACKUP_ROOT}/postgres"
MEDIA_DIR="${BACKUP_ROOT}/media"

RETENTION_DAYS="${RETENTION_DAYS:-14}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-line-workflow-postgres}"
POSTGRES_DB="${POSTGRES_DB:-linechat}"
POSTGRES_USER="${POSTGRES_USER:-lineapp}"
MEDIA_VOLUME="${MEDIA_VOLUME:-line-workflow_line-workflow-media}"

# หยุดถ้าดิสก์เหลือน้อยกว่านี้ (MB) กันไม่ให้ backup ทำเครื่องเต็มจนเว็บอื่นล่ม
MIN_FREE_MB="${MIN_FREE_MB:-2048}"

timestamp="$(date +%Y%m%d-%H%M%S)"

log() {
  echo "[$(date +%Y-%m-%dT%H:%M:%S%z)] $*"
}

free_mb="$(df -Pm /opt | awk 'NR==2 {print $4}')"
if [ "$free_mb" -lt "$MIN_FREE_MB" ]; then
  log "ยกเลิก: ดิสก์เหลือ ${free_mb} MB น้อยกว่าขั้นต่ำ ${MIN_FREE_MB} MB"
  exit 1
fi

mkdir -p "$DB_DIR" "$MEDIA_DIR"

# ---------- 1) ฐานข้อมูล ----------
db_file="${DB_DIR}/linechat_${timestamp}.sql.gz"
db_tmp="${db_file}.part"

# เขียนลงไฟล์ .part ก่อนแล้วค่อยเปลี่ยนชื่อ
# ถ้า pg_dump พังกลางคัน จะได้ไม่เหลือไฟล์ที่ดูเหมือนสมบูรณ์แต่ใช้กู้ไม่ได้
if docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
     | gzip -9 > "$db_tmp"; then
  mv "$db_tmp" "$db_file"
  log "ฐานข้อมูล: $db_file ($(du -h "$db_file" | cut -f1))"
else
  rm -f "$db_tmp"
  log "ผิดพลาด: pg_dump ไม่สำเร็จ"
  exit 1
fi

find "$DB_DIR" -type f -name 'linechat_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

# ---------- 2) ไฟล์สื่อ ----------
media_src="$(docker volume inspect "$MEDIA_VOLUME" --format '{{.Mountpoint}}')"

if [ -d "$media_src" ]; then
  rsync -a "${media_src}/" "${MEDIA_DIR}/"
  log "ไฟล์สื่อ: ${MEDIA_DIR} ($(du -sh "$MEDIA_DIR" | cut -f1), $(find "$MEDIA_DIR" -type f | wc -l) ไฟล์)"
else
  log "ข้ามไฟล์สื่อ: ไม่พบ volume $MEDIA_VOLUME"
fi

log "เสร็จ (ดิสก์เหลือ $(df -Pm /opt | awk 'NR==2 {print $4}') MB)"
