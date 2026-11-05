import type { PrismaClient, Prisma } from '@prisma/client';
import { payableSessions } from './billingSessionScope';
import { getISTDateString } from './dateUtils';
import { generateReceiptSecurityToken } from './server/receiptSecurity';
import { numberToIndianWords } from './currency';

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
type AmountSplit = { cash: number; upi: number; bank: number; total: number; count: number };
type Defaulter = { id: string; amount: number; count: number; dues: { id: string; name: string; amount: number; dueDate: string }[] };
type Collector = { id: string; name: string; role: string; count: number; total: number };
type ClassCollection = { className: string; collected: number; dues: number; count: number; total: number; efficiency: number };
export type DashboardBillingReport = {
  totalEarnings: number; currentOverdueAmount: number; futureUnbilledAmount: number; totalDues: number; overdueCount: number; overdueStudentCount: number;
  cashTally: number; upiTally: number; bankTally: number; todayCash: number; todayUpi: number; todayBank: number; todayTotal: number;
  monthlyTotal: number; monthlyRevenue: Record<string, number>; collectorsList: Collector[]; topDefaulters: Defaulter[];
  classCollectionsList: ClassCollection[]; ownToday: AmountSplit;
  recentReceipts: DashboardReceipt[]; ownRecentReceipts: DashboardReceipt[];
};

const receiptSelect = {
  id: true, studentId: true, receiptNumber: true, manualReceiptNo: true, amountPaid: true, status: true,
  paymentMethod: true, transactionReference: true, createdAt: true, createdById: true, remarks: true,
  student: { select: { id: true, name: true, admissionNumber: true, rollNumber: true, fatherName: true, class: { select: { name: true, section: true } } } },
  createdBy: { select: { name: true, role: true } },
  items: { select: { amount: true, ledgerEntry: { select: { id: true, studentId: true, description: true, amount: true,
    student: { select: { id: true, name: true, admissionNumber: true, rollNumber: true, fatherName: true, class: { select: { name: true, section: true } } } },
  } } } },
} satisfies Prisma.ReceiptSelect;
type ReceiptRow = Prisma.ReceiptGetPayload<{ select: typeof receiptSelect }>;
type ReceiptSnapshot = {
  subtotal?: number; discount?: number; arrears?: number; amountInWords?: string;
  items?: { studentId?: string; name?: string; amount?: number; discount?: number; balance?: number; originalAmount?: number }[];
  studentsList?: { id: string; name: string; admissionNo?: string; rollNo?: string; classSection?: string }[];
  upiId?: string; upiMerchantName?: string; fatherName?: string; otherArrears?: number; totalFamilyDueRemaining?: number;
};
function formatReceipt(row: ReceiptRow) {
  let snapshot: ReceiptSnapshot = {};
  try { snapshot = JSON.parse(row.remarks || '{}') as ReceiptSnapshot; } catch { /* Historical notes need not be JSON. */ }
  const primary = row.student;
  const actualStudents = [...new Map([...(primary ? [primary] : []), ...(row.items || []).map(item => item.ledgerEntry.student)].filter((student): student is NonNullable<typeof student> => !!student).map(student => [student.id, student])).values()];
  const studentsList = Array.isArray(snapshot.studentsList) && snapshot.studentsList.length ? snapshot.studentsList : actualStudents.map(student => ({
    id: student.id, name: student.name, admissionNo: student.admissionNumber, rollNo: student.rollNumber || '', classSection: `${student.class.name}-${student.class.section}`,
  }));
  const studentIds = [...new Set([...(studentsList.map(student => student.id)), ...(snapshot.items || []).map(item => item.studentId), row.studentId].filter((id): id is string => !!id))];
  return {
    id: row.id, studentId: row.studentId, studentIds, receiptNo: row.receiptNumber,
    verificationToken: generateReceiptSecurityToken(row.receiptNumber), manualReceiptNo: row.manualReceiptNo,
    amount: row.amountPaid, subtotal: snapshot.subtotal ?? row.amountPaid, discount: snapshot.discount ?? 0, arrears: snapshot.arrears ?? 0,
    amountInWords: snapshot.amountInWords || numberToIndianWords(row.amountPaid), status: row.status,
    method: row.paymentMethod, paymentMethod: row.paymentMethod, transactionRef: row.transactionReference || '',
    createdAt: getISTDateString(row.createdAt), createdById: row.createdById,
    collectedBy: row.createdBy?.name || 'System', collectedByRole: row.createdBy?.role || 'ADMIN',
    studentName: studentsList.map(student => student.name).join(', ') || primary?.name || 'Student',
    classSection: studentsList.map(student => student.classSection).filter(Boolean).join(', '),
    admissionNo: studentsList.map(student => student.admissionNo).filter(Boolean).join(', '),
    rollNo: studentsList.map(student => student.rollNo).filter(Boolean).join(', '),
    rollNumber: studentsList.map(student => student.rollNo).filter(Boolean).join(', '),
    fatherName: snapshot.fatherName || actualStudents[0]?.fatherName || '',
    otherArrears: snapshot.otherArrears, totalFamilyDueRemaining: snapshot.totalFamilyDueRemaining,
    studentsList, items: snapshot.items || (row.items || []).map(item => ({ name: item.ledgerEntry.description.replace(/^Assigned: /, ''), originalAmount: item.ledgerEntry.amount, amount: item.amount, discount: 0, balance: 0 })),
    upiId: snapshot.upiId, upiMerchantName: snapshot.upiMerchantName,
  };
}
export type DashboardReceipt = ReturnType<typeof formatReceipt>;

// Same ordered month/exam/session-start rules as getChargeDueDate. The report
// evaluates the actual day (10th/15th), rather than declaring a future fee overdue.
export const dashboardDueDateSQL = `CASE
  WHEN label LIKE '%april%' THEN make_date(sy,4,10)
  WHEN label LIKE '%may%' THEN make_date(sy,5,10)
  WHEN label LIKE '%june%' THEN make_date(sy,6,10)
  WHEN label LIKE '%july%' THEN make_date(sy,7,CASE WHEN label LIKE '%unit 1%' OR label LIKE '%exam%' THEN 15 ELSE 10 END)
  WHEN label LIKE '%august%' THEN make_date(sy,8,10)
  WHEN label LIKE '%september%' THEN make_date(sy,9,10)
  WHEN label LIKE '%october%' THEN make_date(sy,10,CASE WHEN label LIKE '%half yearly%' OR label LIKE '%exam%' THEN 15 ELSE 10 END)
  WHEN label LIKE '%november%' THEN make_date(sy,11,10)
  WHEN label LIKE '%december%' THEN make_date(sy,12,CASE WHEN label LIKE '%unit 2%' OR label LIKE '%exam%' THEN 15 ELSE 10 END)
  WHEN label LIKE '%january%' THEN make_date(ey,1,10)
  WHEN label LIKE '%february%' THEN make_date(ey,2,10)
  WHEN label LIKE '%march%' THEN make_date(ey,3,CASE WHEN label LIKE '%yearly%' OR label LIKE '%exam%' THEN 15 ELSE 10 END)
  WHEN label LIKE '%yearly exam%' OR label LIKE '%annual exam%' THEN make_date(ey,3,15)
  WHEN label LIKE '%m/s%' OR label LIKE '%annual%' OR label LIKE '%admission%' OR label LIKE '%previous session%' THEN make_date(sy,4,10)
  WHEN label ~ 'unit ?-?1' THEN make_date(sy,7,15)
  WHEN label LIKE '%half yearly%' OR label LIKE '%half-yearly%' THEN make_date(sy,10,15)
  WHEN label ~ 'unit ?-?2' THEN make_date(sy,12,15)
  ELSE (("createdAt" + INTERVAL '15 days') AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date END`;

/** One compact SQL aggregate plus two six-receipt reads; never a school ledger download. */
export async function dashboardBilling(db: Pick<PrismaClient, '$queryRawUnsafe' | 'receipt'>, startDate: Date, userId: string, now = new Date()): Promise<DashboardBillingReport> {
  const today = getISTDateString(now);
  const payable = payableSessions(startDate);
  const receiptWhere: Prisma.ReceiptWhereInput = { status: 'ACTIVE', items: { some: { ledgerEntry: { ...payable, entryType: { in: ['CHARGE', 'FINE'] } } } } };
  const [rows, recent, ownRecent] = await Promise.all([
    db.$queryRawUnsafe<{ report: Partial<DashboardBillingReport> }[]>(`
      WITH scoped_charges AS (
        SELECT c.*, REGEXP_REPLACE(c.description, '^Assigned: ', '') AS name,
          LOWER(CASE WHEN c.description ~ '[0-9]{4}-[0-9]{4}' THEN c.description
            ELSE c.description || ' ' || COALESCE(s.name, EXTRACT(YEAR FROM $1::timestamp)::int::text || '-' || (EXTRACT(YEAR FROM $1::timestamp)::int+1)::text) END) AS label
        FROM "LedgerEntry" c LEFT JOIN "AcademicSession" s ON s.id = c."sessionId"
        WHERE c."entryType" = 'CHARGE' AND (c."sessionId" IS NULL OR s."startDate" <= $1)
      ), paid AS (
        SELECT ri."ledgerEntryId", SUM(ri.amount)::bigint AS amount
        FROM "ReceiptItem" ri JOIN "Receipt" r ON r.id = ri."receiptId" AND r.status = 'ACTIVE'
        JOIN scoped_charges c ON c.id = ri."ledgerEntryId"
        GROUP BY ri."ledgerEntryId"
      ), discounted AS (
        SELECT c.id, SUM(ABS(d.amount))::bigint AS amount
        FROM scoped_charges c JOIN "LedgerEntry" d ON d."studentId" = c."studentId"
          AND d."sessionId" IS NOT DISTINCT FROM c."sessionId" AND d."entryType" = 'DISCOUNT'
          AND LOWER(TRIM(REGEXP_REPLACE(d.description, '^.*: ', ''))) = LOWER(TRIM(c.name))
        WHERE d."referenceId" IS NULL OR EXISTS (SELECT 1 FROM "Receipt" r WHERE r.id = d."referenceId" AND r.status = 'ACTIVE')
        GROUP BY c.id
      ), dated AS (
        SELECT c.*, GREATEST(0,c.amount-COALESCE(p.amount,0)-COALESCE(d.amount,0)) AS outstanding,
          COALESCE(substring(label FROM '([0-9]{4})[[:space:]]*-[[:space:]]*[0-9]{2,4}')::int, EXTRACT(YEAR FROM $1::timestamp)::int) AS sy,
          substring(label FROM '[0-9]{4}[[:space:]]*-[[:space:]]*([0-9]{2,4})')::int AS raw_ey
        FROM scoped_charges c LEFT JOIN paid p ON p."ledgerEntryId" = c.id LEFT JOIN discounted d ON d.id = c.id
      ), balances AS (
        SELECT *, ${dashboardDueDateSQL} AS due_date FROM (
          SELECT *, CASE WHEN raw_ey IS NULL THEN sy+1 WHEN raw_ey<100 THEN (sy/100)*100+raw_ey ELSE raw_ey END AS ey FROM dated
        ) years WHERE outstanding > 0
      ), eligible_items AS (
        SELECT ri.amount, r.id AS receipt_id, r."createdById", r."paymentMethod",
          (r."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date AS receipt_date, le."studentId"
        FROM "ReceiptItem" ri JOIN "Receipt" r ON r.id = ri."receiptId" AND r.status = 'ACTIVE'
        JOIN "LedgerEntry" le ON le.id = ri."ledgerEntryId"
        LEFT JOIN "AcademicSession" s ON s.id = le."sessionId"
        WHERE le."entryType" IN ('CHARGE','FINE') AND (le."sessionId" IS NULL OR s."startDate" <= $1)
      ), receipt_totals AS (
        SELECT receipt_id, "createdById", "paymentMethod", receipt_date, SUM(amount)::bigint AS amount
        FROM eligible_items GROUP BY receipt_id,"createdById","paymentMethod",receipt_date
      ), collectors AS (
        SELECT COALESCE(r."createdById",'system') AS id, COALESCE(u.name,'System') AS name, COALESCE(u.role::text,'ADMIN') AS role,
          COUNT(*)::int AS count, SUM(r.amount)::bigint AS total
        FROM receipt_totals r LEFT JOIN "User" u ON u.id = r."createdById"
        GROUP BY r."createdById",u.name,u.role
      ), defaulters AS (
        SELECT "studentId" AS id, SUM(outstanding)::bigint AS amount, COUNT(*)::int AS count
        FROM balances WHERE due_date <= $2::date GROUP BY "studentId" ORDER BY amount DESC,"studentId" LIMIT 5
      ), class_students AS (
        SELECT c.name AS class_name, COUNT(s.id)::int AS count FROM "Class" c LEFT JOIN "Student" s ON s."classId"=c.id GROUP BY c.name
      ), class_paid AS (
        SELECT c.name AS class_name,SUM(i.amount)::bigint AS amount FROM eligible_items i JOIN "Student" s ON s.id=i."studentId" JOIN "Class" c ON c.id=s."classId" GROUP BY c.name
      ), class_dues AS (
        SELECT c.name AS class_name,SUM(b.outstanding)::bigint AS amount FROM balances b JOIN "Student" s ON s.id=b."studentId" JOIN "Class" c ON c.id=s."classId" GROUP BY c.name
      )
      SELECT jsonb_build_object(
        'totalEarnings',COALESCE((SELECT SUM(amount) FROM receipt_totals),0),
        'cashTally',COALESCE((SELECT SUM(amount) FROM receipt_totals WHERE "paymentMethod"='CASH'),0),
        'upiTally',COALESCE((SELECT SUM(amount) FROM receipt_totals WHERE "paymentMethod"='UPI'),0),
        'bankTally',COALESCE((SELECT SUM(amount) FROM receipt_totals WHERE "paymentMethod" NOT IN ('CASH','UPI')),0),
        'todayCash',COALESCE((SELECT SUM(amount) FROM receipt_totals WHERE receipt_date=$2::date AND "paymentMethod"='CASH'),0),
        'todayUpi',COALESCE((SELECT SUM(amount) FROM receipt_totals WHERE receipt_date=$2::date AND "paymentMethod"='UPI'),0),
        'todayBank',COALESCE((SELECT SUM(amount) FROM receipt_totals WHERE receipt_date=$2::date AND "paymentMethod" NOT IN ('CASH','UPI')),0),
        'todayTotal',COALESCE((SELECT SUM(amount) FROM receipt_totals WHERE receipt_date=$2::date),0),
        'monthlyTotal',COALESCE((SELECT SUM(amount) FROM receipt_totals WHERE DATE_TRUNC('month',receipt_date)=DATE_TRUNC('month',$2::date)),0),
        'monthlyRevenue',COALESCE((SELECT jsonb_object_agg(month,total) FROM (
          SELECT to_char(receipt_date,'Mon') AS month,SUM(amount)::bigint AS total FROM receipt_totals
          WHERE receipt_date >= ($1::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
            AND receipt_date < (($1::timestamp + INTERVAL '1 year') AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          GROUP BY to_char(receipt_date,'Mon')) months),'{}'::jsonb),
        'currentOverdueAmount',COALESCE((SELECT SUM(outstanding) FROM balances WHERE due_date <= $2::date),0),
        'futureUnbilledAmount',COALESCE((SELECT SUM(outstanding) FROM balances WHERE due_date > $2::date),0),
        'totalDues',COALESCE((SELECT SUM(outstanding) FROM balances),0),
        'overdueCount',(SELECT COUNT(*)::int FROM balances WHERE due_date <= $2::date),
        'overdueStudentCount',(SELECT COUNT(DISTINCT "studentId")::int FROM balances WHERE due_date <= $2::date),
        'collectorsList',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY total DESC,id) FROM collectors c),'[]'::jsonb),
        'topDefaulters',COALESCE((SELECT jsonb_agg(to_jsonb(d) || jsonb_build_object('dues',(
          SELECT jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'amount',b.outstanding,'dueDate',to_char(b.due_date,'YYYY-MM-DD')) ORDER BY b.due_date,b.id)
          FROM balances b WHERE b."studentId"=d.id AND b.due_date <= $2::date
        )) ORDER BY d.amount DESC,d.id) FROM defaulters d),'[]'::jsonb),
        'classCollectionsList',COALESCE((SELECT jsonb_agg(jsonb_build_object('className',c.class_name,'count',c.count,
          'collected',COALESCE(p.amount,0),'dues',COALESCE(d.amount,0),'total',COALESCE(p.amount,0)+COALESCE(d.amount,0),
          'efficiency',CASE WHEN COALESCE(p.amount,0)+COALESCE(d.amount,0)>0 THEN ROUND(100.0*COALESCE(p.amount,0)/(COALESCE(p.amount,0)+COALESCE(d.amount,0))) ELSE 0 END)
          ORDER BY c.class_name) FROM class_students c LEFT JOIN class_paid p ON p.class_name=c.class_name LEFT JOIN class_dues d ON d.class_name=c.class_name),'[]'::jsonb),
        'ownToday',(SELECT jsonb_build_object('cash',COALESCE(SUM(amount) FILTER (WHERE "paymentMethod"='CASH'),0),
          'upi',COALESCE(SUM(amount) FILTER (WHERE "paymentMethod"='UPI'),0),'bank',COALESCE(SUM(amount) FILTER (WHERE "paymentMethod" NOT IN ('CASH','UPI')),0),
          'total',COALESCE(SUM(amount),0),'count',COUNT(*)::int) FROM receipt_totals WHERE "createdById"=$3 AND receipt_date=$2::date)
      ) AS report`, startDate, today, userId),
    db.receipt.findMany({ where: receiptWhere, take: 6, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: receiptSelect }),
    db.receipt.findMany({ where: { ...receiptWhere, createdById: userId }, take: 6, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: receiptSelect }),
  ]);
  const data = rows[0]?.report || {};
  return {
    totalEarnings: 0, currentOverdueAmount: 0, futureUnbilledAmount: 0, totalDues: 0, overdueCount: 0, overdueStudentCount: 0,
    cashTally: 0, upiTally: 0, bankTally: 0, todayCash: 0, todayUpi: 0, todayBank: 0, todayTotal: 0, monthlyTotal: 0,
    collectorsList: [], topDefaulters: [], classCollectionsList: [], ownToday: { cash: 0, upi: 0, bank: 0, total: 0, count: 0 },
    ...data,
    monthlyRevenue: Object.fromEntries(MONTHS.map(month => [month, data.monthlyRevenue?.[month] || 0])),
    recentReceipts: recent.map(formatReceipt), ownRecentReceipts: ownRecent.map(formatReceipt),
  };
}
