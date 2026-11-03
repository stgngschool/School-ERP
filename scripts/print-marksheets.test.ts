import assert from "node:assert/strict";
import test from "node:test";
import { buildMarksheetSummary } from "../src/lib/marksheetSummary";

const mark = (examName: string, marksObtained = 70, extra = {}) => ({ subject: "ENGLISH", examName, marksObtained, maxMarks: 100, ...extra });
test("Annual alone occupies only Term II and is counted once", () => {
  const summary = buildMarksheetSummary([mark("Annual")], ["ENGLISH"], "All");
  assert.equal(summary.rows[0].obt1, null);
  assert.equal(summary.rows[0].obt2, 70);
  assert.equal(summary.grandObtTotal, 70);
  assert.equal(summary.grandMaxTotal, 100);
});
test("selected exam excludes other exams and legacy integrated 100-mark records do not double count", () => {
  const marks = [mark("Unit-1", 20), mark("Half Yearly", 60), mark("Annual", 80)];
  assert.equal(buildMarksheetSummary(marks, [], "Unit-1").grandObtTotal, 20);
  assert.equal(buildMarksheetSummary(marks, [], "All").grandObtTotal, 140);
});
test("absence belongs only to the selected term record", () => {
  const summary = buildMarksheetSummary([mark("Unit-1", 0, { remarks: "ABSENT" }), mark("Half Yearly", 60), mark("Annual", 80)], [], "All");
  assert.equal(summary.rows[0].isAbsent1, false);
  assert.equal(summary.rows[0].isAbsent2, false);
  assert.equal(buildMarksheetSummary([mark("Annual", 0, { remarks: "AB" })], [], "All").rows[0].isAbsent2, true);
});
test("subject aliases produce one curriculum row and one contribution", () => {
  const summary = buildMarksheetSummary([mark("Annual", 50, { subject: " Art " }), mark("Annual", 50, { subject: "DRAWING" }), mark("Annual", 40, { subject: "EVS" })], ["DRAWING", "SCIENCE/EVS"], "All");
  assert.deepEqual(summary.rows.map(row => row.subName), ["DRAWING", "SCIENCE/EVS"]);
  assert.equal(summary.grandObtTotal, 90);
});
test("missing exams and empty data have no invented totals or grades", () => {
  const summary = buildMarksheetSummary([mark("Annual")], ["ENGLISH"], "Half Yearly");
  assert.equal(summary.rows[0].obt1, null);
  assert.equal(summary.rows[0].obt2, null);
  assert.equal(summary.grandMaxTotal, 0);
  assert.equal(summary.hasData, false);
});
test("20-mark unit and 80-mark main exam add to each 100-mark term", () => {
  const summary = buildMarksheetSummary([
    mark("Unit-1", 17, { maxMarks: 20, breakdown: { Practical: 8, Notebook: 4, "Subject Enrichment": 5 } }),
    mark("Half Yearly", 50, { maxMarks: 80 }),
    mark("Unit-2", 18, { maxMarks: 20 }),
    mark("Annual", 73, { maxMarks: 80 }),
  ], ["ENGLISH"], "All");
  assert.equal(summary.rows[0].obt1, 67);
  assert.equal(summary.rows[0].halfYearly1, 50);
  assert.equal(summary.rows[0].prAct1, 8);
  assert.equal(summary.rows[0].obt2, 91);
  assert.equal(summary.grandObtTotal, 158);
  assert.equal(summary.grandMaxTotal, 200);
  assert.equal(summary.isComplete, true);
});
test("partial term retains recorded marks and is incomplete without fabricated components", () => {
  const summary = buildMarksheetSummary([mark("Unit-1", 17, { maxMarks: 20 })], [], "All");
  assert.equal(summary.grandObtTotal, 17);
  assert.equal(summary.grandMaxTotal, 20);
  assert.equal(summary.rows[0].prAct1, null);
  assert.equal(summary.rows[0].halfYearly1, null);
  assert.equal(summary.isComplete, false);
});
test("Only scope excludes the companion exam from the additive term", () => {
  const summary = buildMarksheetSummary([mark("Unit-1", 17, { maxMarks: 20 }), mark("Half Yearly", 50, { maxMarks: 80 })], [], "Half Yearly");
  assert.equal(summary.grandObtTotal, 50);
  assert.equal(summary.grandMaxTotal, 80);
  assert.equal(summary.rows[0].prAct1, null);
});
test("an absent unit does not mark a present written exam absent", () => {
  const summary = buildMarksheetSummary([mark("Unit-1", 0, { maxMarks: 20, remarks: "ABSENT" }), mark("Half Yearly", 50, { maxMarks: 80 })], [], "All");
  assert.equal(summary.rows[0].internalAbsent1, true);
  assert.equal(summary.rows[0].writtenAbsent1, false);
  assert.equal(summary.rows[0].isAbsent1, false);
  assert.equal(summary.rows[0].obt1, 50);
  assert.equal(summary.grandMaxTotal, 100);
});
test("a known subject with no selected-exam entry stays visible as missing", () => {
  const summary = buildMarksheetSummary([mark("Half Yearly", 50, { maxMarks: 80 }), mark("Annual", 70, { subject: "HINDI", maxMarks: 80 })], ["ENGLISH", "HINDI"], "Half Yearly");
  assert.deepEqual(summary.rows.map(row => row.subName), ["ENGLISH", "HINDI"]);
  assert.equal(summary.rows[1].obt1, null);
  assert.equal(summary.rows[1].obt2, null);
  assert.equal(summary.grandObtTotal, 50);
});
test("a curriculum subject missing entirely prevents a complete annual result", () => {
  const summary = buildMarksheetSummary([mark("Half Yearly", 70), mark("Annual", 80)], ["ENGLISH", "HINDI"], "All");
  assert.equal(summary.isComplete, false);
  assert.equal(summary.rows[1].subName, "HINDI");
  assert.equal(summary.rows[1].obt1, null);
  assert.equal(summary.rows[1].obt2, null);
});
