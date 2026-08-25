import db from "../src/lib/db";

async function applyReceiptCounter() {
  console.log("Applying ReceiptCounter migration...");
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ReceiptCounter" (
      "prefix" TEXT NOT NULL,
      "value"  INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "ReceiptCounter_pkey" PRIMARY KEY ("prefix")
    );
  `);
  console.log("✅ ReceiptCounter table ensured.");
  await db.$disconnect();
}

applyReceiptCounter().catch(e => { console.error(e); process.exit(1); });
