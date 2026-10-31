import test from "node:test";
import assert from "node:assert/strict";
import { searchStudents } from "../src/lib/studentSearch";

const students = [
  { id: "1", name: "Asha", admissionNo: "ADM-100", rollNo: 12, familyCode: "FAM-42" },
  { id: "2", name: "Ravi", admissionNo: null, rollNo: 0, familyCode: null },
];

test("finds a student by family code with case and whitespace ignored", () => {
  assert.deepEqual(searchStudents(students, "  fam-42  ").map(s => s.id), ["1"]);
});

test("finds names, admission numbers and numeric roll numbers", () => {
  for (const query of ["ASHA", "adm-100", "12"]) {
    assert.deepEqual(searchStudents(students, query).map(s => s.id), ["1"]);
  }
  assert.deepEqual(searchStudents(students, "0").map(s => s.id), ["1", "2"]);
});

test("ignores empty queries and missing fields, limits results in source order", () => {
  assert.deepEqual(searchStudents(students, "   "), []);
  assert.deepEqual(searchStudents([...students, { id: "3", name: null }], "unknown"), []);
  assert.deepEqual(searchStudents(students, "a", 1).map(s => s.id), ["1"]);
});
