import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAttendanceReadScope, parseAttendanceClassNames, withAttendanceClassFilter } from "../src/lib/attendanceReadScope";

test("daily attendance uses the exact stored class name and selected day", () => {
  const scope = buildAttendanceReadScope({
    selectedClass: "5-A", selectedDate: "2026-10-31", selectedMonth: "2026-10", activeView: "ROSTER",
    classes: [{ name: "Class 5", section: "A" }, { name: "Class 5", section: "B" }],
  });
  assert.deepEqual(scope, { startDate: "2026-10-31", endDate: "2026-10-31", className: "Class 5", section: "A" });
});

test("monthly attendance computes UTC-safe leap and year-end boundaries", () => {
  const build = (month: string) => buildAttendanceReadScope({ selectedClass: "ALL", selectedDate: "2026-10-31", selectedMonth: month, activeView: "MONTHLY", classes: [] });
  assert.deepEqual(build("2028-02"), { startDate: "2028-02-01", endDate: "2028-02-29" });
  assert.deepEqual(build("2026-12"), { startDate: "2026-12-01", endDate: "2026-12-31" });
});

test("compound class names preserve their actual spelling and section", () => {
  assert.deepEqual(buildAttendanceReadScope({ selectedClass: "Pre-KG-B", selectedDate: "2026-10-31", selectedMonth: "2026-10", activeView: "ROSTER", classes: [{ name: "Pre-KG", section: "B" }] }),
    { startDate: "2026-10-31", endDate: "2026-10-31", className: "Pre-KG", section: "B" });
});

test("unknown class or invalid date cannot broaden a selected-scope request", () => {
  const base = { selectedClass: "5-A", selectedDate: "2026-10-31", selectedMonth: "2026-10", activeView: "ROSTER" as const, classes: [] };
  assert.throws(() => buildAttendanceReadScope(base), /class/i);
  assert.throws(() => buildAttendanceReadScope({ ...base, selectedClass: "ALL", selectedDate: "2026-02-30" }), /date/i);
  assert.throws(() => buildAttendanceReadScope({ ...base, selectedClass: "ALL", activeView: "MONTHLY", selectedMonth: "2026-13" }), /month/i);
});

test("class filter intersects parent, teacher, date and explicit-student authorization", () => {
  const base = { date: { gte: new Date("2026-10-31") }, studentId: { in: ["allowed-a", "allowed-b"] }, sessionId: "session" };
  const filtered = withAttendanceClassFilter(base, "Class 5", "A");
  assert.deepEqual(filtered, { AND: [base, { student: { class: { name: { equals: "Class 5", mode: "insensitive" }, section: { equals: "A", mode: "insensitive" } } } }] });
  assert.deepEqual(base.studentId, { in: ["allowed-a", "allowed-b"] });
  assert.deepEqual(withAttendanceClassFilter({ studentId: "allowed-a" }, "Class 5", "A"), { AND: [{ studentId: "allowed-a" }, { student: { class: { name: { equals: "Class 5", mode: "insensitive" }, section: { equals: "A", mode: "insensitive" } } } }] });
  assert.equal(withAttendanceClassFilter(base), base);
});

test("canonical class aliases all load without crossing sections or duplicating roster names", () => {
  const scope = buildAttendanceReadScope({
    selectedClass: "5-A", selectedDate: "2026-10-31", selectedMonth: "2026-10", activeView: "ROSTER",
    classes: [
      { name: "5", section: "a" }, { name: "Class 5", section: "A" },
      { name: "5", section: "A" }, { name: "class 5", section: "a" },
      { name: "5", section: "B" }, { name: "Class 5", section: "B" },
    ],
  });
  assert.deepEqual(scope, { startDate: "2026-10-31", endDate: "2026-10-31", classNames: ["5", "Class 5"], section: "A" });
  const authorized = { studentId: { in: ["alias-a", "alias-b"] } };
  assert.deepEqual(withAttendanceClassFilter(authorized, undefined, scope.section, scope.classNames), {
    AND: [authorized, { student: { class: { name: { in: ["5", "Class 5"], mode: "insensitive" }, section: { equals: "A", mode: "insensitive" } } } }],
  });
});

test("class-name lists reject malformed or unbounded inputs instead of broadening a read", () => {
  assert.equal(parseAttendanceClassNames(null), undefined);
  assert.deepEqual(parseAttendanceClassNames('["5","Class 5","class 5"]'), ["5", "Class 5"]);
  for (const input of ["not json", "[]", "{}", '[" "]', '[5]', JSON.stringify(["x".repeat(101)]), JSON.stringify(Array.from({ length: 51 }, (_, i) => `Class ${i}`))]) {
    assert.throws(() => parseAttendanceClassNames(input), /classNames/i);
  }
});
