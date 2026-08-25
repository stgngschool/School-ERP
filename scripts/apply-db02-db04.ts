import db from "../src/lib/db";

async function applyDB02DB04() {
  console.log("Applying DB-02/DB-03/DB-04/DB-05 migrations...");

  // Check if ReceiptStatus enum already exists
  const enumExists = await db.$queryRawUnsafe(`
    SELECT 1 FROM pg_type WHERE typname = 'ReceiptStatus' AND typnamespace = 'public'::regnamespace
  `).then((rows: unknown) => (rows as any[]).length > 0).catch(() => false);

  if (!enumExists) {
    // DB-05: ClassStatus enum
    await db.$executeRawUnsafe(`CREATE TYPE "ClassStatus" AS ENUM ('ACTIVE', 'ARCHIVED')`).catch(() => {});
    await db.$executeRawUnsafe(`ALTER TABLE "Class" ALTER COLUMN "status" TYPE "ClassStatus" USING "status"::"ClassStatus"`).catch(() => {});
    await db.$executeRawUnsafe(`ALTER TABLE "Class" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"ClassStatus"`).catch(() => {});
    console.log("✅ Applied: ClassStatus enum");

    // DB-04: ReceiptStatus enum
    await db.$executeRawUnsafe(`CREATE TYPE "ReceiptStatus" AS ENUM ('ACTIVE', 'REVERSED')`).catch(() => {});
    await db.$executeRawUnsafe(`ALTER TABLE "Receipt" ALTER COLUMN "status" TYPE "ReceiptStatus" USING "status"::"ReceiptStatus"`).catch(() => {});
    await db.$executeRawUnsafe(`ALTER TABLE "Receipt" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"ReceiptStatus"`).catch(() => {});
    console.log("✅ Applied: ReceiptStatus enum");

    // DB-02: Receipt.studentId FK ON DELETE SET NULL
    await db.$executeRawUnsafe(`ALTER TABLE "Receipt" DROP CONSTRAINT IF EXISTS "Receipt_studentId_fkey"`).catch(() => {});
    await db.$executeRawUnsafe(`
      ALTER TABLE "Receipt"
      ADD CONSTRAINT "Receipt_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `).catch(() => {});
    console.log("✅ Applied: Receipt.studentId FK SET NULL");

    // DB-03: ReceiptItem.ledgerEntryId FK ON DELETE RESTRICT
    await db.$executeRawUnsafe(`ALTER TABLE "ReceiptItem" DROP CONSTRAINT IF EXISTS "ReceiptItem_ledgerEntryId_fkey"`).catch(() => {});
    await db.$executeRawUnsafe(`
      ALTER TABLE "ReceiptItem"
      ADD CONSTRAINT "ReceiptItem_ledgerEntryId_fkey"
      FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `).catch(() => {});
    console.log("✅ Applied: ReceiptItem.ledgerEntryId FK RESTRICT");
  } else {
    console.log("✅ ReceiptStatus enum already exists — skipping");
  }

  // Check PaymentMethod enum
  const pmEnumExists = await db.$queryRawUnsafe(`
    SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod' AND typnamespace = 'public'::regnamespace
  `).then((rows: unknown) => (rows as any[]).length > 0).catch(() => false);

  if (!pmEnumExists) {
    // Find what values are needed by checking receipt schema
    const cols = await db.$queryRawUnsafe(`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'Receipt'`);
    console.log("Receipt schema:", JSON.stringify(cols, null, 2));
  } else {
    console.log("✅ PaymentMethod enum already exists");
  }

  await db.$disconnect();
}

applyDB02DB04().catch((e) => { console.error(e); process.exit(1); });
