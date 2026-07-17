import db from "./db";

export async function getNextFamilyCode(tx?: any): Promise<string> {
  const client = tx || db;
  // Fetch all parent profiles to parse familyCode and find the max suffix number
  const parents = await client.parentProfile.findMany({
    select: { familyCode: true },
  });

  let maxNum = 0;
  for (const parent of parents) {
    if (parent.familyCode.startsWith("FAM-")) {
      const numStr = parent.familyCode.replace("FAM-", "");
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  return `FAM-${maxNum + 1}`;
}
