import { config } from '../config'
import { queryOne } from '../db'

// ---------------------------------------------------------------------------
// เลขที่เอกสารอัตโนมัติ เช่น MOLD-2026-0007
//
// รูปแบบ: <คำนำหน้าแผนก>-<ปี ค.ศ.>-<เลขรันนิ่ง 4 หลัก>
// เลขรันนิ่งแยกตามแผนกและปี พอขึ้นปีใหม่จะเริ่มนับ 1 ใหม่เอง
//
// เรื่องที่ต้องรู้: เลขจะถูก "ใช้ไป" ทันทีที่ขอ ถ้าขอแล้วไม่ได้ส่ง เลขนั้น
// จะข้ามไปเลย เอกสารจริงในโรงงานก็มีเลขข้ามได้ตามปกติ จึงยอมรับได้
// และดีกว่าการใช้เลขซ้ำซึ่งทำให้อ้างอิงกันผิดตัว
// ---------------------------------------------------------------------------

/** คำนำหน้าเลขที่เอกสารของแต่ละแผนก (คีย์ = ชื่อไฟล์เทมเพลต) */
const PREFIXES: Record<string, string> = {
  hr: 'HR',
  admin: 'ADM',
  account: 'ACC',
  production: 'PRD',
  technical: 'TEC',
  mold: 'MLD',
  sale: 'SAL',
  management: 'MGT'
}

export function referencePrefix(department: string): string {
  const known = PREFIXES[department]
  if (known) return known
  // แผนกที่เพิ่มไฟล์เทมเพลตเองโดยยังไม่ได้ลงคำนำหน้าไว้ ใช้ 3 ตัวแรกของชื่อไฟล์ไปก่อน
  return department.slice(0, 3).toUpperCase() || 'DOC'
}

/** ปีปัจจุบันตามเขตเวลาที่ตั้งไว้ ไม่ใช่ UTC ของเซิร์ฟเวอร์ */
function currentYear(): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric' }).format(new Date())
  return Number(parts)
}

/**
 * ขอเลขที่เอกสารถัดไปของแผนก แล้วจองเลขนั้นไว้เลย
 *
 * ใช้ INSERT ... ON CONFLICT DO UPDATE ... RETURNING เป็นคำสั่งเดียว
 * เพื่อให้การอ่านค่าเดิมกับการเพิ่มค่าเกิดในจังหวะเดียวกัน
 * ถ้าแยกเป็น SELECT แล้วค่อย UPDATE สองคนที่กดพร้อมกันจะได้เลขเดียวกัน
 */
export async function nextReferenceNo(department: string): Promise<string> {
  const year = currentYear()
  const row = await queryOne<{ last_number: number }>(
    `INSERT INTO document_counters (scope, year, last_number)
     VALUES ($1, $2, 1)
     ON CONFLICT (scope, year)
     DO UPDATE SET last_number = document_counters.last_number + 1,
                   updated_at  = now()
     RETURNING last_number`,
    [department, year]
  )

  const running = row?.last_number ?? 1
  return `${referencePrefix(department)}-${year}-${String(running).padStart(4, '0')}`
}

/**
 * ดูว่าเลขถัดไปจะเป็นอะไร โดยไม่จองเลข
 * ใช้แสดงเป็นตัวอย่างในฟอร์มเท่านั้น ห้ามเอาไปใช้เป็นเลขจริง
 * เพราะระหว่างที่ดูอยู่ คนอื่นอาจขอเลขไปแล้ว
 */
export async function peekReferenceNo(department: string): Promise<string> {
  const year = currentYear()
  const row = await queryOne<{ last_number: number }>(
    'SELECT last_number FROM document_counters WHERE scope = $1 AND year = $2',
    [department, year]
  )
  const next = (row?.last_number ?? 0) + 1
  return `${referencePrefix(department)}-${year}-${String(next).padStart(4, '0')}`
}
