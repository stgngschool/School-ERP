// Optional read-only production parity check. Prints only aggregate differences, never student data.
import pg from 'pg';
import assert from 'node:assert/strict';
import { dashboardBillingSql } from '../src/lib/dashboardBilling';
import { getChargeDueDate } from '../src/lib/lateFees';
import { isDueUpToCurrentMonth } from '../src/lib/whatsapp';

async function main() {
  process.loadEnvFile('.env');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    // Execute the production chart CTE against school-midnight boundary fixtures.
    const monthCte=dashboardBillingSql.slice(dashboardBillingSql.indexOf('months AS ('),dashboardBillingSql.indexOf('\n SELECT json_build_object('));
    const chartFixture=`WITH receipts AS (SELECT *, ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date AS day FROM (VALUES
      ('2026-03-31 18:29:59'::timestamp, 1),
      ('2026-03-31 18:30:00'::timestamp, 10),
      ('2027-03-31 18:29:59'::timestamp, 100),
      ('2027-03-31 18:30:00'::timestamp, 1000)) x("createdAt","amountPaid")), ${monthCte} SELECT SUM(amount)::int AS total FROM months`;
    const {rows:[chart]}=await client.query(chartFixture,['2026-04-01','2027-03-31']);
    assert.equal(chart.total,110,'chart includes Apr 1 IST and excludes next Apr 1 IST');
    const cases = [
      ['July Exam 2025-2026','2026-04-02T22:00:00Z'],
      ['October Half Yearly 2025-26','2026-04-02T22:00:00Z'],
      ['December Unit 2 2026-2027','2026-04-02T22:00:00Z'],
      ['January Tuition 2026-2027','2026-04-02T22:00:00Z'],
      ['March Yearly Exam 2026-2027','2026-04-02T22:00:00Z'],
      ['Annual Exam 2026-2027','2026-04-02T22:00:00Z'],
      ['Previous session 2025-2026','2026-04-02T22:00:00Z'],
      ['Unit-1 2026-2027','2026-04-02T22:00:00Z'],
      ['Half-yearly 2026-2027','2026-04-02T22:00:00Z'],
      ['Unit2 2026-2027','2026-04-02T22:00:00Z'],
      ['Custom Fee','2026-03-16T22:00:00Z'],
      ['April 1900-1901','2026-03-16T22:00:00Z'],
      ['Custom Fee','2026-06-30T22:00:00Z'],
    ].map(([name,createdAt],i)=>({id:String(i),name,createdAt,session_name:'2026-2027'}));
    const dueCtes=dashboardBillingSql.slice(dashboardBillingSql.indexOf('named AS ('),dashboardBillingSql.indexOf('overdue AS (')).trim().replace(/,$/,'');
    const fixtureQuery=`WITH bindings AS (SELECT $1::text,$2::text,$4::text,$5::text), charges AS (SELECT * FROM json_to_recordset($6::json) AS x(id text,name text,"createdAt" timestamp,session_name text)), ${dueCtes} SELECT id,to_char(due_date,'YYYY-MM-DD') AS due_date FROM dues`;
    const {rows:dates}=await client.query(fixtureQuery,['2026-04-01','2027-03-31','2026-2027',null, new Date().toISOString(),JSON.stringify(cases)]);
    for(const row of dates){
      const fixture=cases[Number(row.id)];
      const enriched=/\d{4}-\d{4}/.test(fixture.name)?fixture.name:`${fixture.name} ${fixture.session_name}`;
      assert.equal(row.due_date,getChargeDueDate(enriched,new Date(fixture.createdAt).getTime()+15*86400000),`due-date rule: ${fixture.name}`);
    }
    const { rows: [session] } = await client.query('SELECT * FROM "AcademicSession" WHERE "isCurrent"=true ORDER BY "startDate" DESC LIMIT 1');
    assert.ok(session, 'Active session required');
    const now = new Date();
    const { rows: [{ dashboard }] } = await client.query(dashboardBillingSql, [session.startDate,session.endDate,session.name,null,now.toISOString()]);
    const { rows: charges } = await client.query(`SELECT c.*, a.name AS session_name,
      COALESCE((SELECT SUM(ri.amount) FROM "ReceiptItem" ri JOIN "Receipt" r ON r.id=ri."receiptId" WHERE r.status='ACTIVE' AND ri."ledgerEntryId"=c.id),0) AS paid
      FROM "LedgerEntry" c LEFT JOIN "AcademicSession" a ON a.id=c."sessionId"
      WHERE c."entryType"='CHARGE' AND (c."sessionId" IS NULL OR a."startDate"<=$1)`,[session.startDate]);
    const { rows: discounts } = await client.query(`SELECT d.* FROM "LedgerEntry" d LEFT JOIN "Receipt" r ON r.id=d."referenceId" WHERE d."entryType"='DISCOUNT' AND (d."referenceId" IS NULL OR r.status='ACTIVE')`);
    const map = new Map<string,number>();
    for (const d of discounts) {
      const key = `${d.studentId}||${d.sessionId || ''}||${d.description.replace('Discount for: ','').replace(/.*: /,'').trim().toLowerCase()}`;
      map.set(key,(map.get(key)||0)+Math.abs(d.amount));
    }
    let total=0,overdue=0,overdueCount=0; const students=new Set();
    for (const c of charges) {
      const name=c.description.replace('Assigned: ','').trim();
      const amount=Math.max(0,c.amount-Number(c.paid)-(map.get(`${c.studentId}||${c.sessionId||''}||${name.toLowerCase()}`)||0));
      total+=amount;
      const dueDate=getChargeDueDate(/\d{4}-\d{4}/.test(name)?name:`${name} ${c.session_name||session.name}`,new Date(c.createdAt).getTime()+15*86400000);
      // Browser behavior is school-local; reference instant is normalized by the test process timezone.
      if(amount>0 && isDueUpToCurrentMonth({name,dueDate},now)){overdue+=amount;overdueCount++;students.add(c.studentId);}
    }
    assert.equal(dashboard.totalDues,total,'total dues');
    assert.equal(dashboard.currentOverdueAmount,overdue,'overdue amount');
    assert.equal(dashboard.overdueCount,overdueCount,'overdue charge count');
    assert.equal(dashboard.defaultersCount,students.size,'defaulter count');
    const { rows: [receipt] }=await client.query(`SELECT COALESCE(SUM("amountPaid"),0)::text AS total FROM "Receipt" WHERE status='ACTIVE'`);
    assert.equal(dashboard.totalEarnings,Number(receipt.total));
    const { rows: [cashier] }=await client.query(`SELECT "createdById" AS id FROM "Receipt" WHERE status='ACTIVE' LIMIT 1`);
    if(cashier){
      const {rows:[{dashboard:mine}]}=await client.query(dashboardBillingSql,[session.startDate,session.endDate,session.name,cashier.id,now.toISOString()]);
      const {rows:[sum]}=await client.query(`SELECT COALESCE(SUM("amountPaid"),0)::text AS total FROM "Receipt" WHERE status='ACTIVE' AND "createdById"=$1`,[cashier.id]);
      assert.equal(mine.totalEarnings,Number(sum.total));
      assert.ok(mine.recentReceipts.every((r:{createdById:string})=>r.createdById===cashier.id));
    }
    console.log(JSON.stringify({ parity:'passed',chargesChecked:charges.length,responseBytes:Buffer.byteLength(JSON.stringify(dashboard)),totalDues:total,currentOverdueAmount:overdue }));
    await client.query('ROLLBACK');
  } finally { await client.end(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
