import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const scriptsDir = path.resolve(__dirname);
const testFiles = fs.readdirSync(scriptsDir)
  .filter(f => f.startsWith("test-") && f.endsWith(".ts"))
  .sort();

console.log(`Found ${testFiles.length} regression test files to run.\n`);

let totalPassed = 0;
let totalFailed = 0;
let filesRun = 0;
let filesFailed = 0;

for (const file of testFiles) {
  const filePath = path.join(scriptsDir, file);
  console.log(`\n======================================================`);
  console.log(`▶ Running: ${file}`);
  console.log(`======================================================`);

  try {
    const output = execSync(`node --env-file=.env --import=tsx "${filePath}"`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120000,
    });
    console.log(output);

    // Parse pass/fail counts from output
    const match = output.match(/Results: (\d+)\/(\d+) passed(?:, (\d+) failed)?/);
    if (match) {
      totalPassed += parseInt(match[1], 10);
      totalFailed += parseInt(match[3] || "0", 10);
    } else {
      totalPassed += 1;
    }
    filesRun++;
  } catch (err: any) {
    console.error(`❌ ERROR running ${file}:`);
    console.error(err.stdout || "");
    console.error(err.stderr || err.message);
    filesFailed++;
    totalFailed += 1;
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  ALL REGRESSION TEST SUITES SUMMARY`);
console.log(`  Test Files Run: ${filesRun}/${testFiles.length}`);
console.log(`  Files Failed:   ${filesFailed}`);
console.log(`  Total Passed:   ${totalPassed}`);
console.log(`  Total Failed:   ${totalFailed}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

process.exit(filesFailed > 0 ? 1 : 0);
