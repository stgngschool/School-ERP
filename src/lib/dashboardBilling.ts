export interface DashboardBilling {
  totalEarnings: number; currentOverdueAmount: number; futureUnbilledAmount: number; totalDues: number;
  overdueCount: number; defaultersCount: number; cashTally: number; upiTally: number; bankTally: number;
  todayCash: number; todayUpi: number; todayBank: number; todayTotal: number; todayReceiptCount: number;
  monthlyTotal: number; monthlyRevenue: Record<string, number>;
  collectorsList: { name: string; role: string; count: number; total: number }[];
  classCollectionsList: { className: string; collected: number; dues: number; count: number; total: number; efficiency: number }[];
  topDefaulters: { id: string; name: string; classSection: string; amount: number; count: number; phone: string; admNo: string; dues: never[] }[];
  recentReceipts: { id: string; receiptNo: string; manualReceiptNo: string | null; studentId: string | null; studentName: string; classSection: string; amount: number; method: string; createdAt: string; createdById: string; collectedBy: string; collectedByRole: string }[];
  generatedAt: string;
}

// Ordered rules deliberately mirror getChargeDueDate, including month precedence over exam names.
const dueRules: [string, number, number, boolean][] = [
  ['april',4,10,false], ['may',5,10,false], ['june',6,10,false],
  ['july',7,10,false], ['august',8,10,false], ['september',9,10,false],
  ['october',10,10,false], ['november',11,10,false], ['december',12,10,false],
  ['january',1,10,true], ['february',2,10,true], ['march',3,10,true],
];
const dueCase = `CASE ${dueRules.map(([month, n, day, end]) => {
  const exam = month === 'july' ? "(n LIKE '%unit 1%' OR n LIKE '%exam%')" : month === 'october' ? "(n LIKE '%half yearly%' OR n LIKE '%exam%')" : month === 'december' ? "(n LIKE '%unit 2%' OR n LIKE '%exam%')" : month === 'march' ? "(n LIKE '%yearly%' OR n LIKE '%exam%')" : 'false';
  return `WHEN n LIKE '%${month}%' THEN make_date(${end ? 'ey' : 'sy'}, ${n}, CASE WHEN ${exam} THEN 15 ELSE ${day} END)`;
}).join('\n')}
 WHEN n LIKE '%yearly exam%' OR n LIKE '%annual exam%' THEN make_date(ey,3,15)
 WHEN n LIKE '%m/s%' OR n LIKE '%annual%' OR n LIKE '%admission%' OR n LIKE '%previous session%' THEN make_date(sy,4,10)
 WHEN n LIKE '%unit 1%' OR n LIKE '%unit-1%' OR n LIKE '%unit1%' THEN make_date(sy,7,15)
 WHEN n LIKE '%half yearly%' OR n LIKE '%half-yearly%' THEN make_date(sy,10,15)
 WHEN n LIKE '%unit 2%' OR n LIKE '%unit-2%' OR n LIKE '%unit2%' THEN make_date(sy,12,15)
 ELSE (("createdAt" + interval '15 days') AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date END`;

// A single statement gives a consistent snapshot. Only final aggregates + 5/10 compact rows cross the wire.
// $1/$2 session bounds, $3 academic name, $4 optional receipt creator, $5 reference instant.
export const dashboardBillingSql = `WITH
 clock AS (SELECT $5::timestamptz AS now, ($5::timestamptz AT TIME ZONE 'Asia/Kolkata')::date AS today),
 receipts AS MATERIALIZED (
 SELECT r.*, (r."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date AS day
 FROM "Receipt" r WHERE r.status = 'ACTIVE' AND ($4::text IS NULL OR r."createdById" = $4)
 ),
 paid AS (SELECT ri."ledgerEntryId", SUM(ri.amount) AS amount FROM "ReceiptItem" ri
 JOIN "Receipt" r ON r.id = ri."receiptId" AND r.status = 'ACTIVE' GROUP BY ri."ledgerEntryId"),
 discounts AS (SELECT d."studentId", d."sessionId", lower(trim(regexp_replace(replace(d.description,'Discount for: ',''), '^.*: ', ''))) AS name,
 SUM(abs(d.amount::bigint)) AS amount FROM "LedgerEntry" d LEFT JOIN "Receipt" dr ON dr.id = d."referenceId"
 WHERE d."entryType" = 'DISCOUNT' AND (d."referenceId" IS NULL OR dr.status = 'ACTIVE') GROUP BY 1,2,3),
 charges AS (SELECT c.*, trim(replace(c.description,'Assigned: ','')) AS name, a.name AS session_name,
 GREATEST(0, c.amount - COALESCE(p.amount,0) - COALESCE(d.amount,0)) AS outstanding
 FROM "LedgerEntry" c LEFT JOIN "AcademicSession" a ON a.id = c."sessionId"
 LEFT JOIN paid p ON p."ledgerEntryId" = c.id
 LEFT JOIN discounts d ON d."studentId" = c."studentId" AND d."sessionId" IS NOT DISTINCT FROM c."sessionId"
 AND d.name = lower(trim(replace(c.description,'Assigned: ','')))
 WHERE c."entryType" = 'CHARGE' AND (c."sessionId" IS NULL OR a."startDate" <= $1::timestamp)),
 named AS (SELECT *, (("createdAt" + interval '15 days') AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS fallback_local, lower(name) AS n, regexp_match(CASE WHEN name ~ '[0-9]{4}-[0-9]{4}' THEN name ELSE name || ' ' || COALESCE(session_name,$3) END,
 '([0-9]{4})[[:space:]]*-[[:space:]]*([0-9]{2,4})') AS yr FROM charges),
 years AS (SELECT *, CASE WHEN yr[1]::int BETWEEN 2000 AND 2100 THEN yr[1]::int
 ELSE extract(year FROM fallback_local)::int - CASE WHEN extract(month FROM fallback_local) < 4 THEN 1 ELSE 0 END END AS sy,
 CASE WHEN yr[1]::int BETWEEN 2000 AND 2100 THEN CASE WHEN yr[2]::int < 100 THEN (yr[1]::int / 100) * 100 + yr[2]::int ELSE yr[2]::int END
 ELSE extract(year FROM fallback_local)::int + CASE WHEN extract(month FROM fallback_local) >= 4 THEN 1 ELSE 0 END END AS ey FROM named),
 dues AS MATERIALIZED (SELECT *, ${dueCase} AS due_date FROM years),
 overdue AS (SELECT "studentId", SUM(outstanding) AS amount, count(*) AS count FROM dues, clock WHERE outstanding > 0 AND due_date <= clock.today GROUP BY "studentId"),
 collectors AS (SELECT u.name, u.role, count(*) AS count, SUM(r."amountPaid") AS total FROM receipts r JOIN "User" u ON u.id = r."createdById" GROUP BY u.id),
 class_dues AS (SELECT c.name, SUM(d.outstanding) AS dues FROM dues d JOIN "Student" s ON s.id = d."studentId" JOIN "Class" c ON c.id = s."classId" GROUP BY c.name),
 class_allocations AS (SELECT c.name, r."amountPaid" AS amount FROM receipts r JOIN "Student" s ON s.id = r."studentId" JOIN "Class" c ON c.id=s."classId"
 UNION ALL SELECT c.name,ri.amount FROM receipts r JOIN "ReceiptItem" ri ON ri."receiptId"=r.id
 JOIN "LedgerEntry" le ON le.id=ri."ledgerEntryId" JOIN "Student" s ON s.id=le."studentId" JOIN "Class" c ON c.id=s."classId" WHERE r."studentId" IS NULL),
 class_paid AS (SELECT name,SUM(amount) AS collected FROM class_allocations GROUP BY name),
 class_counts AS (SELECT c.name, count(s.id) AS count FROM "Class" c LEFT JOIN "Student" s ON s."classId" = c.id GROUP BY c.name),
 class_rows AS (SELECT cc.name AS "className", COALESCE(cp.collected,0) AS collected, COALESCE(cd.dues,0) AS dues, cc.count,
 COALESCE(cp.collected,0)+COALESCE(cd.dues,0) AS total,
 CASE WHEN COALESCE(cp.collected,0)+COALESCE(cd.dues,0)>0 THEN round(100.0*COALESCE(cp.collected,0)/(COALESCE(cp.collected,0)+COALESCE(cd.dues,0))) ELSE 0 END AS efficiency
 FROM class_counts cc LEFT JOIN class_paid cp ON cp.name=cc.name LEFT JOIN class_dues cd ON cd.name=cc.name),
 top_rows AS (SELECT s.id,s.name,c.name || '-' || c.section AS "classSection",o.amount,o.count,
 COALESCE(NULLIF(s."fatherMobile",''),NULLIF(s."motherMobile",''),'') AS phone,s."admissionNumber" AS "admNo", '[]'::json AS dues
 FROM overdue o JOIN "Student" s ON s.id=o."studentId" JOIN "Class" c ON c.id=s."classId" ORDER BY o.amount DESC,s.id LIMIT 5),
 recent AS (SELECT r.id,r."receiptNumber" AS "receiptNo",r."manualReceiptNo",r."studentId", COALESCE(s.name,'Multiple Siblings') AS "studentName",
 COALESCE(c.name || '-' || c.section,'Unified Family') AS "classSection",r."amountPaid" AS amount,r."paymentMethod" AS method,
 to_char(r.day,'YYYY-MM-DD') AS "createdAt",r."createdById",u.name AS "collectedBy",u.role AS "collectedByRole"
 FROM receipts r LEFT JOIN "Student" s ON s.id=r."studentId" LEFT JOIN "Class" c ON c.id=s."classId" JOIN "User" u ON u.id=r."createdById"
 ORDER BY r."createdAt" DESC,r.id DESC LIMIT 10),
 months AS (SELECT m, COALESCE((SELECT SUM(r."amountPaid") FROM receipts r WHERE extract(month FROM r.day)=m AND r.day >= $1::timestamp::date AND r.day <= $2::timestamp::date),0) AS amount FROM generate_series(1,12) m)
 SELECT json_build_object(
 'totalEarnings',COALESCE(SUM(r."amountPaid"),0),
 'cashTally',COALESCE(SUM(r."amountPaid") FILTER(WHERE r."paymentMethod"='CASH'),0),
 'upiTally',COALESCE(SUM(r."amountPaid") FILTER(WHERE r."paymentMethod"='UPI'),0),
 'bankTally',COALESCE(SUM(r."amountPaid") FILTER(WHERE r."paymentMethod" NOT IN ('CASH','UPI')),0),
 'todayCash',COALESCE(SUM(r."amountPaid") FILTER(WHERE r.day=clock.today AND r."paymentMethod"='CASH'),0),
 'todayUpi',COALESCE(SUM(r."amountPaid") FILTER(WHERE r.day=clock.today AND r."paymentMethod"='UPI'),0),
 'todayBank',COALESCE(SUM(r."amountPaid") FILTER(WHERE r.day=clock.today AND r."paymentMethod" NOT IN ('CASH','UPI')),0),
 'todayTotal',COALESCE(SUM(r."amountPaid") FILTER(WHERE r.day=clock.today),0),
 'todayReceiptCount',count(r.id) FILTER(WHERE r.day=clock.today),
 'monthlyTotal',COALESCE(SUM(r."amountPaid") FILTER(WHERE date_trunc('month',r.day)=date_trunc('month',clock.today)),0),
 'currentOverdueAmount',(SELECT COALESCE(SUM(amount),0) FROM overdue),
 'futureUnbilledAmount',(SELECT COALESCE(SUM(outstanding),0) FROM dues WHERE due_date>clock.today),
 'totalDues',(SELECT COALESCE(SUM(outstanding),0) FROM dues),
 'overdueCount',(SELECT COALESCE(SUM(count),0) FROM overdue), 'defaultersCount',(SELECT count(*) FROM overdue),
 'monthlyRevenue',(SELECT json_object_agg((ARRAY['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[m],amount) FROM months),
 'collectorsList',COALESCE((SELECT json_agg(collectors ORDER BY total DESC,name) FROM collectors),'[]'::json),
 'classCollectionsList',COALESCE((SELECT json_agg(class_rows ORDER BY collected DESC,"className") FROM class_rows),'[]'::json),
 'topDefaulters',COALESCE((SELECT json_agg(top_rows) FROM top_rows),'[]'::json),
 'recentReceipts',COALESCE((SELECT json_agg(recent) FROM recent),'[]'::json),
 'generatedAt',clock.now) AS dashboard FROM clock LEFT JOIN receipts r ON true GROUP BY clock.today,clock.now`;

export async function dashboardBilling(
  db: { $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> },
  session: { startDate: string; endDate: string; name: string }, receiptCreator: string | null,
  now = new Date(),
): Promise<DashboardBilling> {
  const rows = await db.$queryRawUnsafe<{ dashboard: DashboardBilling }[]>(dashboardBillingSql,
    session.startDate, session.endDate, session.name, receiptCreator, now.toISOString());
  if (!rows[0]?.dashboard) throw new Error('Dashboard aggregate returned no result');
  return rows[0].dashboard;
}


