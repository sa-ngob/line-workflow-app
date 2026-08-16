import fs from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------------------
// โหลดชุด Flex Template ของ ESPA Engineering (โฟลเดอร์ espa-line-flex-templates)
//
// แต่ละไฟล์เป็น LINE Messaging API "message object" เต็มก้อน:
//   { "type": "flex", "altText": "...", "contents": { bubble } }
// และใช้ placeholder รูปแบบ {{DEPT_FIELD}} เช่น {{HR_TITLE}}, {{SALE_STATUS}}
//
// service นี้ทำ 3 อย่าง:
//   1) ค้นหาโฟลเดอร์ template แล้วลิสต์แผนกที่มี
//   2) แทนค่า placeholder ด้วยข้อมูลที่ผู้ใช้กรอก (escape ให้ปลอดภัยกับ JSON)
//   3) ตัดส่วนที่ไม่มีข้อมูลออก (hero รูปว่าง / ปุ่มที่ไม่มีลิงก์) กัน LINE reject
// ---------------------------------------------------------------------------

/** ฟิลด์ที่ทุกแผนกใช้ร่วมกัน (ส่วนท้ายของ placeholder หลัง prefix แผนก) */
export const ESPA_FIELDS = [
  'ALT_TEXT',
  'HERO_IMAGE_URL',
  'TITLE',
  'MESSAGE',
  'REFERENCE_NO',
  'STATUS',
  'DATETIME',
  'OWNER',
  'NOTE',
  'PRIMARY_URL',
  'SECONDARY_URL'
] as const

export type EspaField = (typeof ESPA_FIELDS)[number]
export type EspaValues = Partial<Record<EspaField, string | undefined>>

/** ป้ายชื่อแผนกภาษาไทย (คีย์ = ชื่อไฟล์ไม่รวม .json) */
const DEPARTMENT_LABELS: Record<string, string> = {
  hr: 'ฝ่ายทรัพยากรบุคคล (HR)',
  admin: 'ฝ่ายธุรการ (Admin)',
  account: 'ฝ่ายบัญชี (Account)',
  production: 'ฝ่ายผลิต (Production)',
  technical: 'ฝ่ายเทคนิค (Technical)',
  mold: 'ฝ่ายแม่พิมพ์ (Mold)',
  sale: 'ฝ่ายขาย (Sale)',
  management: 'ฝ่ายบริหาร (Management)'
}

/**
 * หาโฟลเดอร์ template แบบยืดหยุ่น รองรับทั้งตอน dev (cwd = line-workflow-app)
 * และเมื่อกำหนดเองผ่าน ENV ถ้าไม่เจอเลยจะคืน path เริ่มต้น (ให้ caller ไปเจอ error ตอนอ่านไฟล์)
 */
export function espaTemplatesDir(): string {
  const candidates = [
    process.env.ESPA_TEMPLATES_DIR,
    path.resolve(process.cwd(), '../espa-line-flex-templates'),
    path.resolve(process.cwd(), 'espa-line-flex-templates'),
    path.resolve(__dirname, '../../../espa-line-flex-templates')
  ].filter((p): p is string => Boolean(p))

  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir
    } catch {
      // ข้ามไป candidate ถัดไป
    }
  }
  return candidates[0] ?? candidates[1] ?? ''
}

export interface EspaTemplateInfo {
  key: string
  label: string
}

/** ลิสต์แผนกที่มีไฟล์ template จริงในโฟลเดอร์ (เรียงตามลำดับที่กำหนดไว้ก่อน แล้วตามด้วยที่เหลือ) */
export function listEspaTemplates(): EspaTemplateInfo[] {
  const dir = espaTemplatesDir()
  let files: string[] = []
  try {
    files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.json'))
  } catch {
    return []
  }

  const order = Object.keys(DEPARTMENT_LABELS)
  return files
    .map((f) => f.replace(/\.json$/i, ''))
    .sort((a, b) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      if (ia === -1 && ib === -1) return a.localeCompare(b)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
    .map((key) => ({ key, label: DEPARTMENT_LABELS[key] ?? key }))
}

/** true ถ้า URL ว่าง ไม่ใช่ string หรือยังเหลือ placeholder ค้างอยู่ */
function isBlankUri(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '' || value.includes('{{')
}

/**
 * ตัด node ที่ไม่มีข้อมูลออกจากต้นไม้ Flex:
 *   - image (hero) ที่ url ว่าง -> คืน null (พาเรนต์จะลบ key ทิ้ง)
 *   - button ที่ไม่มีลิงก์ -> คืน null (ถูกกรองออกจาก array)
 *   - action ชนิด uri ที่ลิงก์ว่าง -> ลบ action ทิ้ง แต่คง element ไว้
 * คืน null เพื่อบอกพาเรนต์ให้ลบ node นี้
 */
function pruneFlex(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(pruneFlex).filter((n) => n !== null)
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>

    if (obj.type === 'image' && isBlankUri(obj.url)) return null
    if (obj.type === 'button') {
      const action = obj.action as Record<string, unknown> | undefined
      if (!action || isBlankUri(action.uri)) return null
    }

    const action = obj.action as Record<string, unknown> | undefined
    if (action && action.type === 'uri' && isBlankUri(action.uri)) {
      delete obj.action
    }

    for (const key of Object.keys(obj)) {
      const cleaned = pruneFlex(obj[key])
      if (cleaned === null) delete obj[key]
      else obj[key] = cleaned
    }
    return obj
  }
  return node
}

export interface EspaFilledMessage {
  key: string
  altText: string
  contents: unknown
}

/**
 * โหลด template ของแผนกที่ระบุ แล้วแทนค่า placeholder ทั้งหมด
 * แทนค่าโดยไม่สนใจ prefix แผนก (จับที่ส่วนท้าย เช่น _TITLE) เพราะแต่ละไฟล์มีเฉพาะ prefix ของตัวเอง
 *
 * throw ถ้าอ่านไฟล์ไม่ได้ หรือ JSON หลังแทนค่าพัง
 */
export function loadEspaTemplate(key: string, values: EspaValues): EspaFilledMessage {
  // กัน path traversal: อนุญาตเฉพาะชื่อไฟล์ตัวอักษร/ตัวเลข/ขีด
  const safeKey = key.replace(/[^a-z0-9_-]/gi, '')
  if (!safeKey) throw new Error('ไม่ได้ระบุแผนก')

  const file = path.join(espaTemplatesDir(), `${safeKey}.json`)
  // ตัด BOM (﻿) ที่ไฟล์จาก PowerShell/Notepad มักติดมา ไม่งั้น JSON.parse พัง
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '')

  // แทน {{PREFIX_SUFFIX}} -> ค่าจาก values[SUFFIX] โดย escape ให้ปลอดภัยในบริบท JSON string
  const filled = raw.replace(/\{\{[A-Z]+_([A-Z_]+)\}\}/g, (_match, suffix: string) => {
    const value = values[suffix as EspaField] ?? ''
    // JSON.stringify ครอบด้วย " แล้วตัดหัวท้ายออก = escape quote/backslash/newline ครบ
    return JSON.stringify(value).slice(1, -1)
  })

  let message: { altText?: unknown; contents?: unknown }
  try {
    message = JSON.parse(filled)
  } catch (err) {
    throw new Error(`เทมเพลต ${safeKey} แปลงเป็น JSON ไม่ได้: ${err instanceof Error ? err.message : String(err)}`)
  }

  const contents = pruneFlex(message.contents)
  const altText =
    typeof message.altText === 'string' && message.altText.trim() !== ''
      ? message.altText
      : `ESPA Engineering | ${values.TITLE ?? 'แจ้งเตือน'}`

  return { key: safeKey, altText, contents }
}
