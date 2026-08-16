# ESPA Engineering — LINE Flex Message Templates

ชุด template สำหรับส่งข้อความภายในองค์กร แยก 1 แผนกต่อ 1 ไฟล์:

- `hr.json` — HR
- `admin.json` — Admin
- `account.json` — Account
- `production.json` — Production
- `technical.json` — Technical
- `mold.json` — Mold
- `sale.json` — Sale
- `management.json` — Management

## รูปแบบไฟล์

ทุกไฟล์เป็น LINE Messaging API message object พร้อมใช้ในรายการ `messages`:

```json
{
  "type": "flex",
  "altText": "ข้อความสำรอง",
  "contents": {
    "type": "bubble"
  }
}
```

ตัวอย่าง request body:

```json
{
  "to": "USER_OR_GROUP_ID",
  "messages": [
    { "...": "วาง object จากไฟล์ template ที่แทนค่าแล้วตรงนี้" }
  ]
}
```

> อย่าใส่ Channel access token, user ID หรือข้อมูลลับลงในไฟล์ template ให้เก็บในระบบ secret/environment ของแอป

## Placeholder

ใช้รูปแบบ `{{DEPARTMENT_FIELD}}` แล้วแทนค่าก่อนส่ง โดย `DEPARTMENT` คือ `HR`, `ADMIN`, `ACCOUNT`, `PRODUCTION`, `TECHNICAL`, `MOLD`, `SALE` หรือ `MANAGEMENT`

| ส่วนท้าย | ความหมาย | ตัวอย่าง |
|---|---|---|
| `_ALT_TEXT` | ข้อความสำรองในหน้าแชต/อุปกรณ์ที่ไม่แสดง Flex | `แจ้งเตือนเอกสารใหม่` |
| `_HERO_IMAGE_URL` | URL รูป HTTPS ที่เข้าถึงได้จากอินเทอร์เน็ต | `https://example.com/images/hr.jpg` |
| `_TITLE` | หัวข้อหลัก | `แจ้งผลอนุมัติการลา` |
| `_MESSAGE` | รายละเอียด | `คำขอลาของคุณได้รับการอนุมัติแล้ว` |
| `_REFERENCE_NO` | เลขอ้างอิง | `HR-2026-00125` |
| `_STATUS` | สถานะ | `อนุมัติแล้ว` |
| `_DATETIME` | วันที่และเวลา | `16 ส.ค. 2026 09:30` |
| `_OWNER` | ผู้รับผิดชอบ | `ฝ่ายทรัพยากรบุคคล` |
| `_NOTE` | หมายเหตุสั้น | `โปรดตรวจสอบรายละเอียดภายใน 3 วัน` |
| `_PRIMARY_URL` | ลิงก์ของรูปและปุ่มหลัก (HTTPS หรือ LINE URL scheme ที่รองรับ) | `https://intranet.example.com/hr/125` |
| `_SECONDARY_URL` | ลิงก์ปุ่มรอง | `https://intranet.example.com/contact/hr` |

## วิธีปรับแต่ง

1. ค้นหาและแทน placeholder ทั้งหมดของไฟล์ก่อนส่ง ห้ามเหลือ `{{...}}` ใน payload จริง
2. เปลี่ยนสีหลักที่ `header.backgroundColor`, ปุ่มหลัก `color` และสีสถานะ โดยใช้ค่าสี hex เช่น `#1565C0`
3. เปลี่ยนสีพื้นรายละเอียดที่ `body.contents` กล่องข้อมูล `backgroundColor`
4. เปลี่ยนรูปที่ `hero.url`; ใช้ HTTPS และขนาดภาพที่เหมาะกับอัตราส่วน `20:9`
5. เปลี่ยนข้อความปุ่มที่ `footer.contents[].action.label` และลิงก์ที่ `action.uri`
6. ทดสอบ JSON ที่แทนค่าแล้วใน LINE Flex Message Simulator ก่อนนำขึ้นระบบจริง

## ข้อควรระวัง

- JSON ไม่รองรับ comment จึงอธิบายทุก placeholder ไว้ใน README นี้
- `altText` ควรสื่อความหมายได้ด้วยตัวเอง และไม่ควรมีข้อมูลอ่อนไหว
- URL รูปและลิงก์ต้องเข้าถึงได้ตามสิทธิ์ของผู้ใช้งาน
- ตรวจสอบ consent, สิทธิ์ผู้รับ, tenant/แผนก, quiet hours และการส่งซ้ำก่อน dispatch
- หลีกเลี่ยงข้อมูลเงินเดือน เลขบัญชี หรือข้อมูลส่วนบุคคลในข้อความ preview; ให้แสดงผ่านหน้าที่ต้องยืนยันสิทธิ์แทน

เอกสารอ้างอิง: LINE Developers — Flex Message elements, layout, actions และ Messaging API reference

© Aidev.Techthai Group • พัฒนาโดย Sa_ngob
