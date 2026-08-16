import fs from 'node:fs'
import path from 'node:path'
import { espaTemplatesDir } from '../src/services/espaTemplates'

// ---------------------------------------------------------------------------
// สร้างชุด Flex Template ของ ESPA Engineering ทั้ง 8 แผนก
//
// ทำไมต้อง generate แทนการเขียน JSON ทีละไฟล์:
//   โครงการ์ดเหมือนกันทุกแผนก ต่างกันแค่สี ป้ายชื่อแถว และข้อความปุ่ม
//   ถ้าเขียนมือ 8 ไฟล์ พอจะแก้โครงทีหลังต้องไล่แก้ 8 รอบและมักหลุด
//   ไฟล์ .json ที่ได้ยังคง commit ไว้ตามเดิม แก้ด้วยมือทีหลังได้
//
//   npx tsx scripts/build-espa-templates.ts
//   npx tsx scripts/check-espa-templates.ts   (ตรวจผลหลังสร้าง)
// ---------------------------------------------------------------------------

interface Department {
  key: string
  prefix: string
  /** ชื่อไทยที่ขึ้นหัวการ์ด */
  nameTh: string
  /** ชื่ออังกฤษ สื่อหน้างานจริงมากกว่าชื่อแผนกตามผังองค์กร */
  nameEn: string
  /** สีหลัก ใช้กับหัวการ์ดและปุ่มหลัก ต้องเข้มพอให้ตัวหนังสือขาวอ่านออก */
  accent: string
  /** สีอ่อนของชุดเดียวกัน ใช้กับบรรทัดเล็กบนหัวการ์ด */
  accentSoft: string
  /** พื้นกล่องหมายเหตุ */
  noteBg: string
  /** ป้าย 4 แถวรายละเอียด เรียงตาม REFERENCE_NO / STATUS / DATETIME / OWNER */
  rows: [string, string, string, string]
  /** ข้อความปุ่ม (LINE จำกัด 20 ตัวอักษร) */
  primaryLabel: string
  secondaryLabel: string
  /** ตัวอย่างเรื่องที่แผนกนี้ใช้ส่ง เขียนไว้ใน README ให้คนกรอกเข้าใจบริบท */
  useCases: string[]
}

// ธุรกิจ: โรงงานฉีดพลาสติกและผลิตแม่พิมพ์
// ป้ายแต่ละแถวจึงใช้คำที่หน้างานเรียกจริง ไม่ใช่คำกลาง ๆ อย่าง "เลขที่/วันที่"
const DEPARTMENTS: Department[] = [
  {
    key: 'hr',
    prefix: 'HR',
    nameTh: 'ฝ่ายทรัพยากรบุคคล',
    nameEn: 'HUMAN RESOURCES',
    accent: '#0F766E',
    accentSoft: '#99F6E4',
    noteBg: '#F0FDFA',
    rows: ['เลขที่ประกาศ', 'สถานะ', 'มีผลวันที่', 'ผู้ประกาศ'],
    primaryLabel: 'อ่านประกาศฉบับเต็ม',
    secondaryLabel: 'ติดต่อฝ่ายบุคคล',
    useCases: [
      'ประกาศตารางกะและการทำงานล่วงเวลา',
      'นัดอบรมความปลอดภัยประจำเดือน',
      'ประกาศรับสมัครช่างฉีด ช่างแม่พิมพ์',
      'แจ้งผลอนุมัติการลา'
    ]
  },
  {
    key: 'admin',
    prefix: 'ADMIN',
    nameTh: 'ฝ่ายธุรการ',
    nameEn: 'GENERAL AFFAIRS',
    accent: '#475569',
    accentSoft: '#CBD5E1',
    noteBg: '#F8FAFC',
    rows: ['เลขที่เรื่อง', 'สถานะ', 'กำหนดส่ง', 'ผู้ดูแลเรื่อง'],
    primaryLabel: 'เปิดเอกสาร',
    secondaryLabel: 'สอบถามธุรการ',
    useCases: [
      'แจ้งเวียนเอกสารและระเบียบภายใน',
      'แจ้งกำหนดการรถรับส่งและยานพาหนะ',
      'ติดตามใบขอซื้อวัสดุสิ้นเปลือง',
      'แจ้งซ่อมอาคารและสาธารณูปโภค'
    ]
  },
  {
    key: 'account',
    prefix: 'ACCOUNT',
    nameTh: 'ฝ่ายบัญชีและการเงิน',
    nameEn: 'ACCOUNTING',
    accent: '#B45309',
    accentSoft: '#FDE68A',
    noteBg: '#FFFBEB',
    rows: ['เลขที่เอกสาร', 'สถานะชำระ', 'ครบกำหนด', 'ผู้ติดต่อ'],
    primaryLabel: 'ดูเอกสาร',
    secondaryLabel: 'แจ้งชำระเงิน',
    useCases: [
      'แจ้งวางบิลและใบแจ้งหนี้',
      'เตือนครบกำหนดชำระของลูกค้า',
      'แจ้งรับชำระเงินเรียบร้อย',
      'ขอเอกสารประกอบภาษี'
    ]
  },
  {
    key: 'production',
    prefix: 'PRODUCTION',
    nameTh: 'ฝ่ายผลิต',
    nameEn: 'INJECTION LINE',
    accent: '#1D4ED8',
    accentSoft: '#BFDBFE',
    noteBg: '#EFF6FF',
    rows: ['Job No. / งานฉีด', 'สถานะไลน์ผลิต', 'กะ / ช่วงเวลา', 'หัวหน้ากะ'],
    primaryLabel: 'ดูแผนการผลิต',
    secondaryLabel: 'แจ้งปัญหาหน้างาน',
    useCases: [
      'แจ้งเริ่มงานฉีดและเปลี่ยนรุ่นการผลิต',
      'รายงานยอดผลิตและของเสียรายกะ',
      'แจ้งไลน์หยุดและสาเหตุ',
      'แจ้งเปลี่ยนแม่พิมพ์บนเครื่องฉีด'
    ]
  },
  {
    key: 'technical',
    prefix: 'TECHNICAL',
    nameTh: 'ฝ่ายเทคนิคและซ่อมบำรุง',
    nameEn: 'MAINTENANCE',
    accent: '#C2410C',
    accentSoft: '#FED7AA',
    noteBg: '#FFF7ED',
    rows: ['เลขที่ใบแจ้งซ่อม', 'สถานะงานซ่อม', 'นัดเข้าดำเนินการ', 'ช่างผู้รับผิดชอบ'],
    primaryLabel: 'ดูใบแจ้งซ่อม',
    secondaryLabel: 'แจ้งเครื่องเสีย',
    useCases: [
      'แจ้งเครื่องฉีดขัดข้องและผลการซ่อม',
      'แจ้งกำหนด PM เครื่องจักรและชิลเลอร์',
      'แจ้งงานซ่อมระบบไฮดรอลิกและฮีตเตอร์',
      'ติดตามอะไหล่ที่รออะไหล่เข้า'
    ]
  },
  {
    key: 'mold',
    prefix: 'MOLD',
    nameTh: 'ฝ่ายแม่พิมพ์',
    nameEn: 'MOLD SHOP',
    accent: '#6D28D9',
    accentSoft: '#DDD6FE',
    noteBg: '#F5F3FF',
    rows: ['รหัสแม่พิมพ์', 'สถานะงานแม่พิมพ์', 'กำหนดทดลองฉีด', 'ผู้ควบคุมงาน'],
    primaryLabel: 'ดูข้อมูลแม่พิมพ์',
    secondaryLabel: 'แจ้งปัญหาแม่พิมพ์',
    useCases: [
      'แจ้งความคืบหน้างานสร้างแม่พิมพ์ใหม่',
      'นัดทดลองฉีด T0 / T1 และแจ้งผล',
      'แจ้งงานซ่อมและขัดเงาแม่พิมพ์',
      'แจ้งส่งมอบแม่พิมพ์ให้ฝ่ายผลิต'
    ]
  },
  {
    key: 'sale',
    prefix: 'SALE',
    nameTh: 'ฝ่ายขาย',
    nameEn: 'SALES',
    accent: '#15803D',
    accentSoft: '#BBF7D0',
    noteBg: '#F0FDF4',
    rows: ['เลขที่ใบสั่งซื้อ', 'สถานะออเดอร์', 'กำหนดส่งมอบ', 'ผู้ดูแลลูกค้า'],
    primaryLabel: 'ดูรายละเอียดออเดอร์',
    secondaryLabel: 'ติดต่อฝ่ายขาย',
    useCases: [
      'แจ้งใบเสนอราคาและผลการอนุมัติ',
      'แจ้งรับ PO และยืนยันกำหนดส่ง',
      'อัปเดตสถานะออเดอร์ให้ทีมภายใน',
      'แจ้งเลื่อนกำหนดส่งมอบ'
    ]
  },
  {
    key: 'management',
    prefix: 'MANAGEMENT',
    nameTh: 'ฝ่ายบริหาร',
    nameEn: 'MANAGEMENT',
    accent: '#0F172A',
    accentSoft: '#94A3B8',
    noteBg: '#F1F5F9',
    rows: ['เลขที่รายงาน', 'สถานะ', 'รอบรายงาน', 'ผู้จัดทำ'],
    primaryLabel: 'เปิดรายงาน',
    secondaryLabel: 'ดูแดชบอร์ด',
    useCases: [
      'สรุปยอดผลิตและยอดขายรายวัน',
      'รายงาน OEE และอัตราของเสีย',
      'แจ้งนโยบายและมติที่ประชุม',
      'แจ้งเตือนรายการผิดปกติที่ต้องตัดสินใจ'
    ]
  }
]

const TEXT_DARK = '#0F172A'
const TEXT_BODY = '#475569'
const TEXT_MUTED = '#94A3B8'
const HAIRLINE = '#E2E8F0'

/** แถวรายละเอียด: ป้ายคงที่ + ค่าจาก placeholder (ถ้าไม่กรอก pruneFlex จะตัดทั้งแถว) */
function detailRow(label: string, placeholder: string): unknown {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: label, size: 'sm', color: TEXT_MUTED, flex: 4, wrap: true },
      { type: 'text', text: placeholder, size: 'sm', color: TEXT_DARK, weight: 'bold', flex: 6, align: 'end', wrap: true }
    ]
  }
}

function buildTemplate(d: Department): unknown {
  const p = (field: string) => `{{${d.prefix}_${field}}}`

  return {
    type: 'flex',
    altText: p('ALT_TEXT'),
    contents: {
      type: 'bubble',
      size: 'mega',

      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: d.accent,
        paddingAll: '20px',
        spacing: 'none',
        contents: [
          { type: 'text', text: 'ESPA ENGINEERING', size: 'xxs', color: d.accentSoft, weight: 'bold' },
          { type: 'text', text: `${d.nameTh} · ${d.nameEn}`, size: 'sm', color: '#FFFFFF', weight: 'bold', margin: 'sm', wrap: true }
        ]
      },

      // ถ้าไม่ใส่ URL รูป pruneFlex จะลบ hero ทิ้งทั้งก้อน การ์ดยังใช้ได้ปกติ
      hero: {
        type: 'image',
        url: p('HERO_IMAGE_URL'),
        size: 'full',
        aspectRatio: '20:9',
        aspectMode: 'cover',
        action: { type: 'uri', label: 'เปิดดู', uri: p('PRIMARY_URL') }
      },

      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        spacing: 'md',
        contents: [
          { type: 'text', text: p('TITLE'), size: 'xl', weight: 'bold', color: TEXT_DARK, wrap: true },
          { type: 'text', text: p('MESSAGE'), size: 'sm', color: TEXT_BODY, wrap: true },
          { type: 'separator', margin: 'lg', color: HAIRLINE },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              detailRow(d.rows[0], p('REFERENCE_NO')),
              detailRow(d.rows[1], p('STATUS')),
              detailRow(d.rows[2], p('DATETIME')),
              detailRow(d.rows[3], p('OWNER'))
            ]
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: d.noteBg,
            cornerRadius: '10px',
            paddingAll: '14px',
            margin: 'lg',
            contents: [{ type: 'text', text: p('NOTE'), size: 'xs', color: TEXT_BODY, wrap: true }]
          }
        ]
      },

      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        paddingTop: '0px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: d.accent,
            height: 'sm',
            action: { type: 'uri', label: d.primaryLabel, uri: p('PRIMARY_URL') }
          },
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: { type: 'uri', label: d.secondaryLabel, uri: p('SECONDARY_URL') }
          },
          // บรรทัดนี้คงที่เสมอ เพื่อไม่ให้ footer เหลือ contents ว่างเมื่อไม่ได้ใส่ลิงก์ทั้งสองปุ่ม
          {
            type: 'text',
            text: 'ESPA Engineering · ระบบแจ้งเตือนภายใน',
            size: 'xxs',
            color: TEXT_MUTED,
            align: 'center',
            margin: 'md',
            wrap: true
          }
        ]
      }
    }
  }
}

function buildReadme(): string {
  const rows = DEPARTMENTS.map(
    (d) => `| \`${d.key}.json\` | ${d.nameTh} | \`{{${d.prefix}_*}}\` | ${d.accent} |`
  ).join('\n')

  const useCases = DEPARTMENTS.map(
    (d) => `### ${d.nameTh} (\`${d.key}\`)\n\n${d.useCases.map((u) => `- ${u}`).join('\n')}\n\n| ช่อง | ป้ายบนการ์ด |\n|---|---|\n| \`REFERENCE_NO\` | ${d.rows[0]} |\n| \`STATUS\` | ${d.rows[1]} |\n| \`DATETIME\` | ${d.rows[2]} |\n| \`OWNER\` | ${d.rows[3]} |`
  ).join('\n\n')

  return `# ESPA Engineering — LINE Flex Message Templates

ชุดการ์ดแจ้งเตือนภายในองค์กร สำหรับโรงงานฉีดพลาสติกและผลิตแม่พิมพ์ แยก 1 แผนกต่อ 1 ไฟล์

> ไฟล์ในโฟลเดอร์นี้สร้างจาก \`scripts/build-espa-templates.ts\`
> ถ้าจะแก้โครงการ์ดหรือสีให้แก้ที่สคริปต์แล้วรันใหม่ จะได้ครบทั้ง 8 แผนกพร้อมกัน
> แก้ไฟล์ \`.json\` ตรง ๆ ก็ได้ แต่การรันสคริปต์ครั้งถัดไปจะเขียนทับ

\`\`\`bash
npx tsx scripts/build-espa-templates.ts    # สร้างใหม่ทั้งชุด
npx tsx scripts/check-espa-templates.ts    # ตรวจก่อนใช้จริง
\`\`\`

## แผนกทั้งหมด

| ไฟล์ | แผนก | Placeholder | สีหลัก |
|---|---|---|---|
${rows}

## รูปแบบไฟล์

ทุกไฟล์เป็น LINE Messaging API message object พร้อมใช้ในรายการ \`messages\`:

\`\`\`json
{
  "type": "flex",
  "altText": "ข้อความสำรอง",
  "contents": { "type": "bubble" }
}
\`\`\`

## ช่องที่กรอกได้ (เหมือนกันทุกแผนก ต่างกันที่ป้ายบนการ์ด)

| ส่วนท้าย | ความหมาย | ตัวอย่าง |
|---|---|---|
| \`_ALT_TEXT\` | ข้อความสำรองในรายการแชต | \`แจ้งผลทดลองฉีด M-2026-014\` |
| \`_HERO_IMAGE_URL\` | รูปหัวการ์ด (HTTPS, อัตราส่วน 20:9) | \`https://example.com/mold.jpg\` |
| \`_TITLE\` | หัวข้อหลัก | \`ผลทดลองฉีด T1 ผ่านเกณฑ์\` |
| \`_MESSAGE\` | รายละเอียด | \`ชิ้นงานได้ขนาดตามแบบ รอตรวจผิวงาน\` |
| \`_REFERENCE_NO\` | เลขอ้างอิง (ป้ายต่างกันตามแผนก) | \`M-2026-014\` |
| \`_STATUS\` | สถานะ | \`ผ่าน T1\` |
| \`_DATETIME\` | วันที่และเวลา | \`16 ส.ค. 2026 09:30\` |
| \`_OWNER\` | ผู้รับผิดชอบ | \`คุณสมชาย\` |
| \`_NOTE\` | หมายเหตุสั้น | \`รอผลตรวจ CMM ก่อนส่งมอบ\` |
| \`_PRIMARY_URL\` | ลิงก์ปุ่มหลักและรูป | \`https://intranet.example.com/mold/14\` |
| \`_SECONDARY_URL\` | ลิงก์ปุ่มรอง | \`https://intranet.example.com/contact\` |

**ช่องที่ไม่กรอกจะหายไปจากการ์ดเอง** ไม่ต้องกรอกครบทุกช่อง — แถวที่ไม่มีค่าจะถูกตัดทั้งแถว
ไม่เหลือป้ายลอย, ไม่ใส่รูปก็ไม่มีหัวการ์ดรูป, ไม่ใส่ลิงก์ปุ่มนั้นก็หายไป
(ตรรกะอยู่ใน \`src/services/espaTemplates.ts\`)

## เรื่องที่แต่ละแผนกใช้ส่ง

${useCases}

## ข้อควรระวัง

- ข้อความปุ่มยาวได้ไม่เกิน 20 ตัวอักษร และสีต้องเป็น hex 6 หลัก — \`check-espa-templates.ts\` ตรวจให้แล้ว
- \`altText\` ควรสื่อความหมายได้ด้วยตัวเอง และไม่ควรมีข้อมูลอ่อนไหว
- URL รูปต้องเป็น HTTPS และเปิดได้จากอินเทอร์เน็ต ไม่ใช่ IP ภายในโรงงาน
- หลีกเลี่ยงเงินเดือน เลขบัญชี หรือข้อมูลส่วนบุคคลบนการ์ด เพราะเห็นได้ทุกคนในกลุ่ม
- ตรวจกลุ่มปลายทางก่อนส่งทุกครั้ง การ์ดของฝ่ายบัญชีไม่ควรหลุดเข้ากลุ่มหน้างาน

© Aidev.Techthai Group • พัฒนาโดย Sa_ngob
`
}

function run(): void {
  const dir = espaTemplatesDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  console.log('')
  console.log(`  สร้างเทมเพลตลงที่ ${dir}`)
  console.log('')

  for (const d of DEPARTMENTS) {
    const file = path.join(dir, `${d.key}.json`)
    // เขียนแบบ UTF-8 ไม่มี BOM และลงท้ายด้วยขึ้นบรรทัดใหม่
    fs.writeFileSync(file, `${JSON.stringify(buildTemplate(d), null, 2)}\n`, 'utf8')
    console.log(`  - ${d.key.padEnd(11)} ${d.nameTh.padEnd(24)} ${d.accent}`)
  }

  fs.writeFileSync(path.join(dir, 'README.md'), buildReadme(), 'utf8')
  console.log(`  - README.md`)
  console.log('')
  console.log(`  เสร็จ ${DEPARTMENTS.length} แผนก`)
  console.log('')
}

run()
