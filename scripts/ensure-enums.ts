import db from "../src/lib/db";

async function main() {
  await db.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClassStatus') THEN
        CREATE TYPE "ClassStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
      END IF;
    END $$;
  `);
  console.log("ClassStatus enum ensured!");
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
