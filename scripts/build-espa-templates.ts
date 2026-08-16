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

/**
 * งานที่แผนกนั้นส่งซ้ำ ๆ เลือกจาก dropdown แล้วฟอร์มเติมให้ ไม่ต้องพิมพ์ใหม่
 * ทุกช่องยังแก้ได้ตามปกติหลังเลือก
 */
interface Preset {
  /** คีย์สั้น ๆ ไม่ซ้ำในแผนกเดียวกัน */
  id: string
  /** ข้อความใน dropdown */
  label: string
  title: string
  message: string
  status: string
  owner: string
  note: string
}

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
  /** งานที่ทำบ่อยของแผนกนี้ */
  presets: Preset[]
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
    presets: [
      {
        id: 'shift',
        label: 'ประกาศตารางกะและโอที',
        title: 'ประกาศตารางกะประจำสัปดาห์',
        message: 'ตารางกะและการทำงานล่วงเวลาสัปดาห์หน้าประกาศแล้ว ขอให้หัวหน้ากะแจ้งลูกทีมและยืนยันกลับ',
        status: 'ประกาศแล้ว',
        owner: 'ฝ่ายทรัพยากรบุคคล',
        note: 'ยืนยันรายชื่อโอทีกลับภายในวันศุกร์ก่อน 16:00 น.'
      },
      {
        id: 'safety',
        label: 'นัดอบรมความปลอดภัย',
        title: 'อบรมความปลอดภัยประจำเดือน',
        message: 'ขอเชิญพนักงานฝ่ายผลิตและฝ่ายแม่พิมพ์เข้าอบรมความปลอดภัยในการทำงานกับเครื่องจักร',
        status: 'รอเข้าร่วม',
        owner: 'จป. วิชาชีพ',
        note: 'เข้าอบรมครบตามกำหนดถือเป็นเวลาทำงานปกติ'
      },
      {
        id: 'recruit',
        label: 'ประกาศรับสมัครงาน',
        title: 'เปิดรับสมัครช่างประจำโรงงาน',
        message: 'เปิดรับสมัครช่างฉีดพลาสติกและช่างแม่พิมพ์ พนักงานแนะนำคนรู้จักได้ที่ฝ่ายบุคคล',
        status: 'เปิดรับสมัคร',
        owner: 'ฝ่ายทรัพยากรบุคคล',
        note: 'มีเงินรางวัลสำหรับพนักงานที่แนะนำผู้สมัครที่ผ่านทดลองงาน'
      },
      {
        id: 'leave',
        label: 'แจ้งผลอนุมัติการลา',
        title: 'แจ้งผลอนุมัติการลา',
        message: 'คำขอลาได้รับการพิจารณาแล้ว ตรวจสอบรายละเอียดและวันคงเหลือได้ในระบบ',
        status: 'อนุมัติแล้ว',
        owner: 'ฝ่ายทรัพยากรบุคคล',
        note: 'หากข้อมูลไม่ถูกต้อง แจ้งกลับภายใน 3 วันทำการ'
      }
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
    presets: [
      {
        id: 'circular',
        label: 'แจ้งเวียนเอกสาร/ระเบียบ',
        title: 'แจ้งเวียนระเบียบปฏิบัติฉบับใหม่',
        message: 'มีระเบียบปฏิบัติฉบับปรับปรุงประกาศใช้ ขอให้ทุกแผนกอ่านและลงนามรับทราบ',
        status: 'รอลงนามรับทราบ',
        owner: 'ฝ่ายธุรการ',
        note: 'ลงนามรับทราบภายใน 7 วันนับจากวันประกาศ'
      },
      {
        id: 'vehicle',
        label: 'แจ้งกำหนดรถรับส่ง',
        title: 'ปรับกำหนดการรถรับส่งพนักงาน',
        message: 'ปรับเวลารถรับส่งพนักงานตามรอบกะใหม่ ขอให้ตรวจสอบจุดขึ้นรถและเวลาก่อนเดินทาง',
        status: 'มีผลแล้ว',
        owner: 'ฝ่ายธุรการ',
        note: 'สอบถามจุดขึ้นรถเพิ่มเติมได้ที่ป้อมรักษาความปลอดภัย'
      },
      {
        id: 'purchase',
        label: 'ติดตามใบขอซื้อ',
        title: 'อัปเดตสถานะใบขอซื้อวัสดุ',
        message: 'ใบขอซื้อวัสดุสิ้นเปลืองอยู่ระหว่างดำเนินการ จะแจ้งกำหนดของเข้าอีกครั้งเมื่อผู้ขายยืนยัน',
        status: 'อยู่ระหว่างจัดซื้อ',
        owner: 'ฝ่ายธุรการ',
        note: 'ของเร่งด่วนให้แจ้งหัวหน้าแผนกเพื่อขออนุมัติพิเศษ'
      },
      {
        id: 'facility',
        label: 'แจ้งซ่อมอาคาร',
        title: 'แจ้งงานซ่อมบำรุงอาคาร',
        message: 'มีงานซ่อมบำรุงอาคารและระบบสาธารณูปโภค อาจมีเสียงดังและปิดพื้นที่บางส่วนชั่วคราว',
        status: 'ระหว่างดำเนินการ',
        owner: 'ฝ่ายธุรการ',
        note: 'หลีกเลี่ยงพื้นที่ที่กั้นไว้เพื่อความปลอดภัย'
      }
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
    presets: [
      {
        id: 'invoice',
        label: 'แจ้งวางบิล/ใบแจ้งหนี้',
        title: 'แจ้งวางบิลงวดปัจจุบัน',
        message: 'จัดทำใบแจ้งหนี้เรียบร้อยแล้ว ขอให้ฝ่ายขายยืนยันยอดกับลูกค้าก่อนนำส่งเอกสาร',
        status: 'รอวางบิล',
        owner: 'ฝ่ายบัญชีและการเงิน',
        note: 'ตรวจยอดและเลขที่ PO ให้ตรงกันก่อนส่งเอกสาร'
      },
      {
        id: 'due',
        label: 'เตือนครบกำหนดชำระ',
        title: 'แจ้งเตือนลูกหนี้ครบกำหนดชำระ',
        message: 'มีรายการครบกำหนดชำระในสัปดาห์นี้ ขอให้ผู้ดูแลลูกค้าติดตามและยืนยันกำหนดโอน',
        status: 'รอชำระ',
        owner: 'ฝ่ายบัญชีและการเงิน',
        note: 'เกินกำหนด 7 วันจะเข้าสู่ขั้นตอนติดตามหนี้'
      },
      {
        id: 'received',
        label: 'แจ้งรับชำระเงินแล้ว',
        title: 'ได้รับชำระเงินเรียบร้อย',
        message: 'ได้รับเงินโอนตามใบแจ้งหนี้เรียบร้อยแล้ว ออกใบเสร็จรับเงินให้ในระบบ',
        status: 'ชำระแล้ว',
        owner: 'ฝ่ายบัญชีและการเงิน',
        note: 'ขอใบกำกับภาษีตัวจริงได้ที่ฝ่ายบัญชี'
      },
      {
        id: 'tax-doc',
        label: 'ขอเอกสารประกอบภาษี',
        title: 'ขอเอกสารประกอบการยื่นภาษี',
        message: 'ขอให้แผนกที่เกี่ยวข้องนำส่งเอกสารประกอบการยื่นภาษีให้ครบตามรายการที่แจ้ง',
        status: 'รอเอกสาร',
        owner: 'ฝ่ายบัญชีและการเงิน',
        note: 'ส่งเอกสารก่อนวันที่ 5 ของเดือนถัดไป'
      }
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
    presets: [
      {
        id: 'job-start',
        label: 'แจ้งเริ่มงานฉีด/เปลี่ยนรุ่น',
        title: 'เริ่มงานฉีดรุ่นใหม่',
        message: 'เริ่มงานฉีดตามแผนการผลิต ขอให้ตรวจชิ้นงานแรกกับแบบและบันทึกพารามิเตอร์เครื่องก่อนเดินยาว',
        status: 'เริ่มผลิตแล้ว',
        owner: 'หัวหน้ากะ',
        note: 'ชิ้นงานแรกต้องผ่าน QC ก่อนเดินการผลิตต่อเนื่อง'
      },
      {
        id: 'shift-report',
        label: 'รายงานยอดผลิตรายกะ',
        title: 'สรุปยอดผลิตประจำกะ',
        message: 'สรุปยอดผลิตได้ตามเป้า ของเสียอยู่ในเกณฑ์ที่ยอมรับได้ รายละเอียดแยกตามเครื่องดูในระบบ',
        status: 'ปิดกะแล้ว',
        owner: 'หัวหน้ากะ',
        note: 'ของเสียเกินเกณฑ์ให้ระบุสาเหตุในใบรายงานทุกครั้ง'
      },
      {
        id: 'line-stop',
        label: 'แจ้งไลน์หยุด',
        title: 'แจ้งไลน์ผลิตหยุดชั่วคราว',
        message: 'ไลน์ผลิตหยุดชั่วคราว อยู่ระหว่างแก้ไขและจะแจ้งเวลาเดินเครื่องอีกครั้งเมื่อพร้อม',
        status: 'หยุดชั่วคราว',
        owner: 'หัวหน้ากะ',
        note: 'หากกระทบกำหนดส่ง ให้แจ้งฝ่ายขายทันที'
      },
      {
        id: 'mold-change',
        label: 'แจ้งเปลี่ยนแม่พิมพ์',
        title: 'เปลี่ยนแม่พิมพ์บนเครื่องฉีด',
        message: 'อยู่ระหว่างถอดและติดตั้งแม่พิมพ์ตัวใหม่ ขอให้ฝ่ายแม่พิมพ์เตรียมอุปกรณ์และตรวจสภาพก่อนติดตั้ง',
        status: 'ระหว่างเปลี่ยนแม่พิมพ์',
        owner: 'หัวหน้ากะ',
        note: 'ตรวจอุณหภูมิและระบบหล่อเย็นก่อนเริ่มฉีดจริง'
      }
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
    presets: [
      {
        id: 'breakdown',
        label: 'แจ้งเครื่องฉีดขัดข้อง',
        title: 'เครื่องฉีดขัดข้อง อยู่ระหว่างแก้ไข',
        message: 'ได้รับแจ้งเครื่องฉีดขัดข้องและเข้าตรวจสอบแล้ว จะแจ้งผลและเวลาที่ใช้ซ่อมอีกครั้ง',
        status: 'ระหว่างซ่อม',
        owner: 'ฝ่ายเทคนิคและซ่อมบำรุง',
        note: 'ห้ามเดินเครื่องจนกว่าช่างจะแจ้งว่าปลอดภัย'
      },
      {
        id: 'pm',
        label: 'แจ้งกำหนด PM เครื่องจักร',
        title: 'แจ้งกำหนดบำรุงรักษาเชิงป้องกัน',
        message: 'ถึงกำหนด PM เครื่องจักรและชิลเลอร์ตามรอบ ขอให้ฝ่ายผลิตจัดคิวเครื่องให้ช่างเข้าดำเนินการ',
        status: 'รอเข้าดำเนินการ',
        owner: 'ฝ่ายเทคนิคและซ่อมบำรุง',
        note: 'ใช้เวลาประมาณ 2 ชั่วโมงต่อเครื่อง'
      },
      {
        id: 'hydraulic',
        label: 'แจ้งซ่อมไฮดรอลิก/ฮีตเตอร์',
        title: 'งานซ่อมระบบไฮดรอลิกและฮีตเตอร์',
        message: 'ดำเนินการซ่อมระบบไฮดรอลิกและชุดฮีตเตอร์ตามใบแจ้งซ่อม ทดสอบเดินเครื่องแล้วอยู่ในเกณฑ์ปกติ',
        status: 'ซ่อมเสร็จแล้ว',
        owner: 'ฝ่ายเทคนิคและซ่อมบำรุง',
        note: 'เฝ้าสังเกตอาการซ้ำในกะถัดไปและแจ้งกลับหากผิดปกติ'
      },
      {
        id: 'spare-part',
        label: 'ติดตามอะไหล่',
        title: 'รออะไหล่เข้าเพื่อดำเนินการต่อ',
        message: 'งานซ่อมรออะไหล่จากผู้ขาย จะเข้าดำเนินการต่อทันทีที่ของถึงโรงงาน',
        status: 'รออะไหล่',
        owner: 'ฝ่ายเทคนิคและซ่อมบำรุง',
        note: 'ระหว่างนี้ให้ย้ายงานไปเครื่องสำรองก่อน'
      }
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
    presets: [
      {
        id: 'build-progress',
        label: 'ความคืบหน้างานสร้างแม่พิมพ์',
        title: 'อัปเดตความคืบหน้างานสร้างแม่พิมพ์',
        message: 'งานกัดขึ้นรูปและประกอบชุดแม่พิมพ์คืบหน้าตามแผน จะแจ้งกำหนดทดลองฉีดเมื่อประกอบเสร็จ',
        status: 'ระหว่างสร้าง',
        owner: 'ฝ่ายแม่พิมพ์',
        note: 'หากแบบมีการแก้ไข ขอให้แจ้งก่อนเข้าขั้นตอนประกอบ'
      },
      {
        id: 'trial',
        label: 'นัดทดลองฉีด T0/T1',
        title: 'นัดทดลองฉีดแม่พิมพ์',
        message: 'นัดทดลองฉีดตามกำหนด ขอให้ฝ่ายผลิตเตรียมเครื่องและเม็ดพลาสติกตามสเปกที่ระบุ',
        status: 'รอทดลองฉีด',
        owner: 'ฝ่ายแม่พิมพ์',
        note: 'เตรียมเม็ดพลาสติกให้พอสำหรับการปรับพารามิเตอร์'
      },
      {
        id: 'trial-result',
        label: 'แจ้งผลทดลองฉีด',
        title: 'ผลทดลองฉีดผ่านเกณฑ์',
        message: 'ชิ้นงานได้ขนาดตามแบบ ผิวงานเรียบ ไม่พบรอยยุบ อยู่ระหว่างรอผลตรวจวัดละเอียด',
        status: 'ผ่านการทดลองฉีด',
        owner: 'ฝ่ายแม่พิมพ์',
        note: 'รอผลตรวจ CMM ก่อนส่งมอบให้ฝ่ายผลิต'
      },
      {
        id: 'repair',
        label: 'แจ้งซ่อม/ขัดเงาแม่พิมพ์',
        title: 'งานซ่อมและขัดเงาแม่พิมพ์',
        message: 'รับแม่พิมพ์เข้าซ่อมและขัดเงาผิวโพรงแบบ จะแจ้งกำหนดคืนเครื่องเมื่อดำเนินการเสร็จ',
        status: 'ระหว่างซ่อม',
        owner: 'ฝ่ายแม่พิมพ์',
        note: 'แจ้งฝ่ายผลิตล่วงหน้าเพื่อสลับแผนการผลิต'
      },
      {
        id: 'handover',
        label: 'แจ้งส่งมอบแม่พิมพ์',
        title: 'ส่งมอบแม่พิมพ์ให้ฝ่ายผลิต',
        message: 'แม่พิมพ์ผ่านการตรวจสอบครบถ้วน พร้อมส่งมอบให้ฝ่ายผลิตใช้งานจริง',
        status: 'ส่งมอบแล้ว',
        owner: 'ฝ่ายแม่พิมพ์',
        note: 'บันทึกจำนวนช็อตเริ่มต้นก่อนเริ่มใช้งาน'
      }
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
    presets: [
      {
        id: 'quotation',
        label: 'แจ้งใบเสนอราคา',
        title: 'ส่งใบเสนอราคาให้ลูกค้าแล้ว',
        message: 'จัดทำและส่งใบเสนอราคาให้ลูกค้าเรียบร้อย อยู่ระหว่างรอผลการพิจารณา',
        status: 'รอลูกค้าตอบกลับ',
        owner: 'ฝ่ายขาย',
        note: 'ราคายืนตามเงื่อนไขที่ระบุในใบเสนอราคา'
      },
      {
        id: 'po',
        label: 'แจ้งรับ PO ใหม่',
        title: 'รับใบสั่งซื้อจากลูกค้า',
        message: 'ได้รับใบสั่งซื้อจากลูกค้าแล้ว ขอให้ฝ่ายผลิตและฝ่ายแม่พิมพ์ยืนยันกำลังการผลิตและกำหนดส่ง',
        status: 'รอยืนยันกำหนดส่ง',
        owner: 'ฝ่ายขาย',
        note: 'ยืนยันกำหนดส่งกลับภายใน 2 วันทำการ'
      },
      {
        id: 'order-status',
        label: 'อัปเดตสถานะออเดอร์',
        title: 'อัปเดตความคืบหน้าออเดอร์',
        message: 'งานอยู่ระหว่างการผลิตตามแผน จะแจ้งความคืบหน้าอีกครั้งเมื่อเข้าสู่ขั้นตอนตรวจสอบคุณภาพ',
        status: 'ระหว่างผลิต',
        owner: 'ฝ่ายขาย',
        note: 'ลูกค้าขอเข้าดูงานได้โดยแจ้งล่วงหน้า 1 วัน'
      },
      {
        id: 'delay',
        label: 'แจ้งเลื่อนกำหนดส่ง',
        title: 'แจ้งเลื่อนกำหนดส่งมอบ',
        message: 'มีความจำเป็นต้องเลื่อนกำหนดส่งมอบ ฝ่ายขายจะประสานลูกค้าเพื่อยืนยันกำหนดใหม่',
        status: 'เลื่อนกำหนดส่ง',
        owner: 'ฝ่ายขาย',
        note: 'แจ้งลูกค้าพร้อมเหตุผลและกำหนดใหม่ให้ชัดเจน'
      }
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
    presets: [
      {
        id: 'daily',
        label: 'สรุปผลประกอบการรายวัน',
        title: 'สรุปยอดผลิตและยอดขายประจำวัน',
        message: 'สรุปยอดผลิตและยอดขายประจำวัน พร้อมเปรียบเทียบกับเป้าหมายที่ตั้งไว้',
        status: 'รายงานประจำวัน',
        owner: 'ฝ่ายบริหาร',
        note: 'ดูรายละเอียดแยกตามลูกค้าและเครื่องได้ในแดชบอร์ด'
      },
      {
        id: 'oee',
        label: 'รายงาน OEE และของเสีย',
        title: 'รายงานประสิทธิภาพเครื่องจักรและของเสีย',
        message: 'รายงานค่า OEE และอัตราของเสียรายเครื่อง ใช้ประกอบการวางแผนบำรุงรักษาและปรับกำลังผลิต',
        status: 'รายงานประจำสัปดาห์',
        owner: 'ฝ่ายบริหาร',
        note: 'เครื่องที่ค่า OEE ต่ำกว่าเกณฑ์ให้ทบทวนแผน PM'
      },
      {
        id: 'policy',
        label: 'แจ้งนโยบาย/มติที่ประชุม',
        title: 'แจ้งมติที่ประชุมและนโยบาย',
        message: 'แจ้งมติที่ประชุมฝ่ายบริหารเพื่อให้ทุกแผนกรับทราบและถือปฏิบัติ',
        status: 'ประกาศใช้',
        owner: 'ฝ่ายบริหาร',
        note: 'หัวหน้าแผนกถ่ายทอดให้ทีมภายในสัปดาห์นี้'
      },
      {
        id: 'anomaly',
        label: 'แจ้งรายการผิดปกติ',
        title: 'พบรายการผิดปกติที่ต้องพิจารณา',
        message: 'ระบบตรวจพบรายการที่มีมูลค่าหรือรูปแบบผิดปกติ ขอให้ผู้เกี่ยวข้องตรวจสอบและยืนยันความถูกต้อง',
        status: 'รอตรวจสอบ',
        owner: 'ฝ่ายบริหาร',
        note: 'ยืนยันผลตรวจสอบกลับภายในวันทำการถัดไป'
      }
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
    (d) =>
      `### ${d.nameTh} (\`${d.key}\`)\n\n` +
      `| ช่อง | ป้ายบนการ์ด |\n|---|---|\n` +
      `| \`REFERENCE_NO\` | ${d.rows[0]} |\n| \`STATUS\` | ${d.rows[1]} |\n| \`DATETIME\` | ${d.rows[2]} |\n| \`OWNER\` | ${d.rows[3]} |\n\n` +
      `งานที่เลือกได้จาก dropdown:\n\n${d.presets.map((pr) => `- **${pr.label}** — ${pr.title}`).join('\n')}`
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
    console.log(`  - ${d.key.padEnd(11)} ${d.nameTh.padEnd(24)} ${d.accent}  (${d.presets.length} งาน)`)
  }

  // แยกไฟล์ presets ออกจากไฟล์การ์ด เพราะคนละเรื่องกัน
  // ไฟล์การ์ด = หน้าตา / presets = ข้อความตั้งต้นที่แก้บ่อยกว่ามาก
  const presets = Object.fromEntries(
    DEPARTMENTS.map((d) => [
      d.key,
      d.presets.map((pr) => ({
        id: pr.id,
        label: pr.label,
        title: pr.title,
        message: pr.message,
        status: pr.status,
        owner: pr.owner,
        note: pr.note
      }))
    ])
  )
  fs.writeFileSync(path.join(dir, 'presets.json'), `${JSON.stringify(presets, null, 2)}\n`, 'utf8')
  console.log(`  - presets.json (${DEPARTMENTS.reduce((n, d) => n + d.presets.length, 0)} งานรวมทุกแผนก)`)

  fs.writeFileSync(path.join(dir, 'README.md'), buildReadme(), 'utf8')
  console.log(`  - README.md`)
  console.log('')
  console.log(`  เสร็จ ${DEPARTMENTS.length} แผนก`)
  console.log('')
}

run()
