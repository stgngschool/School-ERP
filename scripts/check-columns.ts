import db from "../src/lib/db";

async function check() {
  const res = await db.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'User' ORDER BY column_name`
  );
  console.log("User columns:", JSON.stringify(res, null, 2));

  // Also check Receipt columns
  const res2 = await db.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'Receipt' ORDER BY column_name`
  );
  console.log("Receipt columns:", JSON.stringify(res2, null, 2));

  await db.$disconnect();
}
check();
