import { ESPA_FIELDS, espaTemplatesDir, listEspaTemplates, loadEspaTemplate } from '../src/services/espaTemplates'

// ---------------------------------------------------------------------------
// ตรวจความถูกต้องของชุด Flex Template ทุกแผนก ก่อนส่งเข้า LINE จริง
//
// ตรวจ 2 สถานการณ์ที่ต่างกันมาก:
//   A) กรอกครบทุกช่อง  -> การ์ดต้องสมบูรณ์
//   B) กรอกแค่ TITLE   -> ต้องไม่เหลือ node ที่ LINE ปฏิเสธ
//      (LINE ตอบ 400 ถ้า text เป็นสตริงว่าง หรือ box มี contents ว่าง)
//
//   npx tsx scripts/check-espa-templates.ts
// ---------------------------------------------------------------------------

const SAMPLE: Record<string, string> = {
  ALT_TEXT: 'ทดสอบเทมเพลต',
  HERO_IMAGE_URL: 'https://example.com/hero.jpg',
  TITLE: 'หัวข้อทดสอบ',
  MESSAGE: 'รายละเอียดทดสอบ',
  REFERENCE_NO: 'TEST-2026-0001',
  STATUS: 'รอดำเนินการ',
  DATETIME: '16 ส.ค. 2026 09:30',
  OWNER: 'ผู้รับผิดชอบทดสอบ',
  NOTE: 'หมายเหตุทดสอบ',
  PRIMARY_URL: 'https://example.com/primary',
  SECONDARY_URL: 'https://example.com/secondary'
}

interface Problem {
  path: string
  detail: string
}

/** เดินทั้งต้นไม้ Flex หาสิ่งที่ LINE จะปฏิเสธ */
function findProblems(node: unknown, path: string, out: Problem[]): void {
  if (Array.isArray(node)) {
    node.forEach((n, i) => findProblems(n, `${path}[${i}]`, out))
    return
  }
  if (!node || typeof node !== 'object') return

  const obj = node as Record<string, unknown>
  const type = obj.type

  if (type === 'text') {
    const t = obj.text
    const hasSpans = Array.isArray(obj.contents) && (obj.contents as unknown[]).length > 0
    if (!hasSpans && (typeof t !== 'string' || t.trim() === '')) {
      out.push({ path, detail: 'text ว่าง — LINE ตอบ 400' })
    }
  }

  if (type === 'span' && (typeof obj.text !== 'string' || obj.text === '')) {
    out.push({ path, detail: 'span ว่าง — LINE ตอบ 400' })
  }

  if (type === 'box') {
    const c = obj.contents
    if (!Array.isArray(c) || c.length === 0) {
      out.push({ path, detail: 'box ไม่มี contents — LINE ตอบ 400' })
    }
  }

  if (type === 'image' && typeof obj.url === 'string' && !/^https:\/\//.test(obj.url)) {
    out.push({ path, detail: `image url ไม่ใช่ https: ${obj.url}` })
  }

  if (type === 'button') {
    const action = obj.action as Record<string, unknown> | undefined
    const label = action?.label
    if (typeof label === 'string' && [...label].length > 20) {
      out.push({ path, detail: `ปุ่มยาว ${[...label].length} ตัว (LINE จำกัด 20)` })
    }
  }

  for (const [k, v] of Object.entries(obj)) {
    if (k === 'color' || k === 'backgroundColor' || k === 'borderColor') {
      if (typeof v === 'string' && !/^#[0-9A-Fa-f]{6}$/.test(v)) {
        out.push({ path: `${path}.${k}`, detail: `สีต้องเป็น hex 6 หลัก: ${v}` })
      }
    }
    findProblems(v, `${path}.${k}`, out)
  }
}

function leftoverPlaceholders(value: unknown): string[] {
  const json = JSON.stringify(value)
  return [...new Set(json.match(/\{\{[A-Z_]+\}\}/g) ?? [])]
}

function run(): void {
  console.log('')
  console.log(`  โฟลเดอร์เทมเพลต: ${espaTemplatesDir()}`)

  const templates = listEspaTemplates()
  if (templates.length === 0) {
    console.error('  [x] ไม่พบไฟล์เทมเพลตเลย')
    process.exit(1)
  }
  console.log(`  พบ ${templates.length} แผนก`)
  console.log('')

  let failed = 0

  for (const { key, label } of templates) {
    const issues: string[] = []

    // --- A) กรอกครบ ---
    try {
      const full = loadEspaTemplate(key, SAMPLE)
      const problems: Problem[] = []
      findProblems(full.contents, 'contents', problems)
      problems.forEach((p) => issues.push(`[กรอกครบ] ${p.path}: ${p.detail}`))

      const left = leftoverPlaceholders(full.contents)
      if (left.length > 0) issues.push(`[กรอกครบ] เหลือ placeholder: ${left.join(', ')}`)
      if (!full.altText || full.altText.includes('{{')) issues.push('[กรอกครบ] altText ไม่ถูกแทนค่า')
    } catch (err) {
      issues.push(`[กรอกครบ] โหลดไม่ได้: ${err instanceof Error ? err.message : String(err)}`)
    }

    // --- B) กรอกแค่ TITLE (ที่เหลือว่าง) ---
    try {
      const sparse = loadEspaTemplate(key, { TITLE: 'หัวข้อทดสอบ' })
      const problems: Problem[] = []
      findProblems(sparse.contents, 'contents', problems)
      problems.forEach((p) => issues.push(`[กรอกน้อย] ${p.path}: ${p.detail}`))
    } catch (err) {
      issues.push(`[กรอกน้อย] โหลดไม่ได้: ${err instanceof Error ? err.message : String(err)}`)
    }

    if (issues.length === 0) {
      console.log(`  [ok] ${key.padEnd(11)} ${label}`)
    } else {
      failed++
      console.log(`  [x]  ${key.padEnd(11)} ${label}`)
      // ยุบปัญหาซ้ำ ๆ ให้เหลือแบบละบรรทัดพร้อมจำนวน
      const counts = new Map<string, number>()
      for (const i of issues) {
        const norm = i.replace(/\[\d+\]/g, '[i]')
        counts.set(norm, (counts.get(norm) ?? 0) + 1)
      }
      for (const [text, n] of counts) {
        console.log(`         - ${text}${n > 1 ? `  (ซ้ำ ${n} จุด)` : ''}`)
      }
    }
  }

  console.log('')
  console.log(`  ฟิลด์ที่รองรับ: ${ESPA_FIELDS.join(', ')}`)
  console.log('')

  if (failed > 0) {
    console.error(`  สรุป: มีปัญหา ${failed} จาก ${templates.length} แผนก`)
    process.exit(1)
  }
  console.log(`  สรุป: ผ่านทั้งหมด ${templates.length} แผนก`)
}

run()
