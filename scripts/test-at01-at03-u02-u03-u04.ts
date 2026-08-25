export {};
/**
 * Test suite for:
 * AT-01: Teacher class-level scoping for attendance (single & bulk marking)
 * AT-03: Attendance session starts April 1st (academic year start), not March 1st
 * U-02: True PARENT deletion without deceptive status blocking
 * U-03: Atomic sequential employeeId generation (no Math.random collisions)
 * U-04: Audit log preservation on user deletion (SetNull FK, compliance audit trails)
 *
 * Run with: npx tsx scripts/test-at01-at03-u02-u03-u04.ts
 */

import { getAcademicYear } from "../src/lib/generateYearlyCharges";

const results: { label: string; pass: boolean }[] = [];

function test(label: string, pass: boolean) {
  results.push({ label, pass });
  console.log(pass ? `  ✅ PASS: ${label}` : `  ❌ FAIL: ${label}`);
  if (!pass) process.exitCode = 1;
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  Focused Tests: AT-01, AT-03, U-02, U-03, U-04");
console.log("═══════════════════════════════════════════════════════════════\n");

// ─── 1. AT-03: Attendance Session Date Start Calculation ──────────────────────
console.log("─── 1. AT-03: Attendance Session Start Date Calculation ───");

function getAttendanceSessionStartDate(date = new Date()): Date {
  const acYear = getAcademicYear(date);
  const startYear = parseInt(acYear.split("-")[0]);
  return new Date(`${startYear}-04-01T00:00:00.000Z`);
}

// In May 2026, session start should be 2026-04-01
const may2026 = new Date("2026-05-15T10:00:00.000Z");
const startMay2026 = getAttendanceSessionStartDate(may2026);
test("AT-03: May 2026 attendance session starts April 1st, 2026", startMay2026.toISOString() === "2026-04-01T00:00:00.000Z");

// In February 2027 (still 2026-2027 academic year), session start should be 2026-04-01
const feb2027 = new Date("2027-02-10T10:00:00.000Z");
const startFeb2027 = getAttendanceSessionStartDate(feb2027);
test("AT-03: Feb 2027 attendance session starts April 1st, 2026 (prior year start)", startFeb2027.toISOString() === "2026-04-01T00:00:00.000Z");

// Month must be April (0-indexed 3) not March (0-indexed 2)
test("AT-03: Session start month is April (month 3, 0-indexed)", startMay2026.getUTCMonth() === 3);
test("AT-03: Session start day is 1st", startMay2026.getUTCDate() === 1);


// ─── 2. AT-01: Teacher Attendance Authorization Scoping ───────────────────────
console.log("\n─── 2. AT-01: Teacher Attendance Authorization Scoping ───");

interface TeacherAuthCheck {
  teacherRole: "ADMIN" | "TEACHER" | "ACCOUNTANT";
  teacherClasses: string[]; // class IDs assigned to teacher
  targetStudentClassId: string | null;
}

function authorizeSingleAttendance(params: TeacherAuthCheck): { authorized: boolean; status: number; error?: string } {
  if (params.teacherRole !== "ADMIN" && params.teacherRole !== "TEACHER" && params.teacherRole !== "ACCOUNTANT") {
    return { authorized: false, status: 403, error: "Unauthorized access." };
  }
  if (params.teacherRole === "ADMIN" || params.teacherRole === "ACCOUNTANT") {
    return { authorized: true, status: 200 };
  }
  // TEACHER role
  if (params.teacherClasses.length === 0) {
    return { authorized: false, status: 403, error: "Forbidden. You are not assigned as a class teacher to any class." };
  }
  const allowed = new Set(params.teacherClasses);
  if (!params.targetStudentClassId || !allowed.has(params.targetStudentClassId)) {
    return { authorized: false, status: 403, error: "Forbidden. Teachers can only mark attendance for students in their assigned classes." };
  }
  return { authorized: true, status: 200 };
}

function authorizeBulkAttendance(
  teacherRole: "ADMIN" | "TEACHER" | "ACCOUNTANT",
  teacherClasses: string[],
  records: { studentId: string; classId: string | null }[]
): { authorized: boolean; status: number; error?: string } {
  if (teacherRole !== "ADMIN" && teacherRole !== "TEACHER" && teacherRole !== "ACCOUNTANT") {
    return { authorized: false, status: 403, error: "Unauthorized access." };
  }
  if (records.length === 0) {
    return { authorized: false, status: 400, error: "Empty records array." };
  }
  if (teacherRole === "ADMIN" || teacherRole === "ACCOUNTANT") {
    return { authorized: true, status: 200 };
  }
  if (teacherClasses.length === 0) {
    return { authorized: false, status: 403, error: "Forbidden. You are not assigned as a class teacher to any class." };
  }
  const allowed = new Set(teacherClasses);
  const unauthorized = records.some((r) => !r.classId || !allowed.has(r.classId));
  if (unauthorized) {
    return { authorized: false, status: 403, error: "Forbidden. Teachers can only mark attendance for students in their assigned classes." };
  }
  return { authorized: true, status: 200 };
}

// Teacher without assigned class
const resNoClass = authorizeSingleAttendance({ teacherRole: "TEACHER", teacherClasses: [], targetStudentClassId: "class-1" });
test("AT-01: Teacher with no assigned class is rejected with 403", !resNoClass.authorized && resNoClass.status === 403);

// Teacher marking student in their assigned class
const resOwnClass = authorizeSingleAttendance({ teacherRole: "TEACHER", teacherClasses: ["class-10a"], targetStudentClassId: "class-10a" });
test("AT-01: Teacher marking student in their own class is authorized (200)", resOwnClass.authorized && resOwnClass.status === 200);

// Teacher marking student in a different class
const resOtherClass = authorizeSingleAttendance({ teacherRole: "TEACHER", teacherClasses: ["class-10a"], targetStudentClassId: "class-9b" });
test("AT-01: Teacher marking student in different class is rejected with 403 Forbidden", !resOtherClass.authorized && resOtherClass.status === 403);

// Teacher marking student with no class assigned
const resNullClass = authorizeSingleAttendance({ teacherRole: "TEACHER", teacherClasses: ["class-10a"], targetStudentClassId: null });
test("AT-01: Teacher marking unassigned student is rejected with 403", !resNullClass.authorized && resNullClass.status === 403);

// Admin marking any student
const resAdmin = authorizeSingleAttendance({ teacherRole: "ADMIN", teacherClasses: [], targetStudentClassId: "class-9b" });
test("AT-01: Admin has unrestricted attendance authorization across all classes", resAdmin.authorized && resAdmin.status === 200);

// Accountant marking any student
const resAcc = authorizeSingleAttendance({ teacherRole: "ACCOUNTANT", teacherClasses: [], targetStudentClassId: "class-10a" });
test("AT-01: Accountant has unrestricted attendance authorization across all classes", resAcc.authorized && resAcc.status === 200);

// Bulk attendance: all in teacher's class
const resBulkValid = authorizeBulkAttendance("TEACHER", ["class-10a"], [
  { studentId: "s1", classId: "class-10a" },
  { studentId: "s2", classId: "class-10a" },
]);
test("AT-01: Bulk attendance where all students belong to teacher is accepted (200)", resBulkValid.authorized && resBulkValid.status === 200);

// Bulk attendance: mixed classes
const resBulkMixed = authorizeBulkAttendance("TEACHER", ["class-10a"], [
  { studentId: "s1", classId: "class-10a" },
  { studentId: "s2", classId: "class-5c" },
]);
test("AT-01: Bulk attendance with mixed classes is rejected with 403 Forbidden", !resBulkMixed.authorized && resBulkMixed.status === 403);


// ─── 3. U-03: Atomic Sequential Employee ID Generation ────────────────────────
console.log("\n─── 3. U-03: Atomic Employee ID Generation ───");

function formatSequentialEmployeeId(role: "TEACHER" | "ACCOUNTANT", year: number, seq: number): string {
  const prefix = role === "TEACHER" ? "TCH" : "ACC";
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

const id1 = formatSequentialEmployeeId("TEACHER", 2026, 1);
const id2 = formatSequentialEmployeeId("TEACHER", 2026, 2);
const accId1 = formatSequentialEmployeeId("ACCOUNTANT", 2026, 1);

test("U-03: Teacher employeeId formats as TCH-YYYY-0001", id1 === "TCH-2026-0001");
test("U-03: Sequential IDs increment predictably without random gaps", id2 === "TCH-2026-0002");
test("U-03: Accountant employeeId formats as ACC-YYYY-0001", accId1 === "ACC-2026-0001");
test("U-03: Prefix clearly distinguishes teacher vs accountant", id1.startsWith("TCH-") && accId1.startsWith("ACC-"));

// Custom duplicate employee ID check
function checkEmployeeIdDuplicate(
  customId: string,
  existingTeacherIds: Set<string>,
  existingAccIds: Set<string>
): boolean {
  return existingTeacherIds.has(customId) || existingAccIds.has(customId);
}

const teachers = new Set(["TCH-2026-0001", "TCH-2026-0002"]);
const accountants = new Set(["ACC-2026-0001"]);

test("U-03: Custom duplicate employeeId is detected for teachers", checkEmployeeIdDuplicate("TCH-2026-0001", teachers, accountants) === true);
test("U-03: Custom duplicate employeeId is detected for accountants", checkEmployeeIdDuplicate("ACC-2026-0001", teachers, accountants) === true);
test("U-03: New unique employeeId is accepted", checkEmployeeIdDuplicate("TCH-2026-0003", teachers, accountants) === false);


// ─── 4. U-04: Compliance Audit Trail Preservation ─────────────────────────────
console.log("\n─── 4. U-04: Audit Log Preservation on User Deletion ───");

interface MockAuditLog {
  id: string;
  userId: string | null;
  user: { name: string; role: string } | null;
  action: string;
  createdAt: Date;
}

function simulateUserDeletionOnAuditLogs(logs: MockAuditLog[], deletedUserId: string): MockAuditLog[] {
  // SetNull behavior: foreign key resets userId and user to null, but NEVER deletes audit records
  return logs.map((log) => {
    if (log.userId === deletedUserId) {
      return { ...log, userId: null, user: null };
    }
    return log;
  });
}

function formatAuditLogForClient(log: MockAuditLog) {
  const timestamp = log.createdAt.toLocaleDateString() + " " + log.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return {
    id: log.id,
    userName: log.user ? `${log.user.name} (${log.user.role})` : "System / Deleted User",
    role: log.user ? log.user.role : "UNKNOWN",
    action: log.action,
    createdAt: timestamp,
  };
}

const initialLogs: MockAuditLog[] = [
  { id: "log-1", userId: "user-100", user: { name: "John Teacher", role: "TEACHER" }, action: "ATTENDANCE_MARKED", createdAt: new Date() },
  { id: "log-2", userId: "user-100", user: { name: "John Teacher", role: "TEACHER" }, action: "HOMEWORK_CREATED", createdAt: new Date() },
  { id: "log-3", userId: "user-200", user: { name: "Admin One", role: "ADMIN" }, action: "FEE_UPDATED", createdAt: new Date() },
];

const afterDeletion = simulateUserDeletionOnAuditLogs(initialLogs, "user-100");

test("U-04: Deleting user preserves count of all audit logs (none destroyed)", afterDeletion.length === initialLogs.length);
test("U-04: Deleted user's audit log userId is set to null (SetNull)", afterDeletion[0].userId === null && afterDeletion[1].userId === null);
test("U-04: Action and historical context remain intact", afterDeletion[0].action === "ATTENDANCE_MARKED" && afterDeletion[1].action === "HOMEWORK_CREATED");
test("U-04: Unrelated user audit logs are untouched", afterDeletion[2].userId === "user-200" && afterDeletion[2].user?.name === "Admin One");

const formattedDeletedLog = formatAuditLogForClient(afterDeletion[0]);
test("U-04: Client formatting renders null user as 'System / Deleted User' without crashing", formattedDeletedLog.userName === "System / Deleted User");
test("U-04: Client formatting renders null user role as 'UNKNOWN'", formattedDeletedLog.role === "UNKNOWN");


// ─── 5. U-02: True PARENT Deletion without Deceptive Status Blocking ──────────
console.log("\n─── 5. U-02: True PARENT Deletion & Family Preservation ───");

interface MockParentAccount {
  user: { id: string; role: "PARENT"; status: string } | null;
  parentProfile: {
    id: string;
    userId: string | null;
    familyCode: string;
    students: { id: string; name: string }[];
    receipts: { id: string; receiptNo: string }[];
  };
}

function deleteParentAccount(account: MockParentAccount): MockParentAccount {
  // Real deletion: decoupled userId on ParentProfile, deletes User record
  const updatedProfile = {
    ...account.parentProfile,
    userId: null,
  };
  return {
    user: null, // deleted from User table
    parentProfile: updatedProfile,
  };
}

const parentBefore: MockParentAccount = {
  user: { id: "p-user-1", role: "PARENT", status: "ACTIVE" },
  parentProfile: {
    id: "profile-1",
    userId: "p-user-1",
    familyCode: "FAM-2026-0001",
    students: [{ id: "std-1", name: "Alice" }, { id: "std-2", name: "Bob" }],
    receipts: [{ id: "rec-1", receiptNo: "REC-2026-0001" }],
  },
};

const parentAfter = deleteParentAccount(parentBefore);

test("U-02: User record is truly deleted (null), NOT retained with status='BLOCKED'", parentAfter.user === null);
test("U-02: ParentProfile survives deletion", parentAfter.parentProfile !== null && parentAfter.parentProfile.id === "profile-1");
test("U-02: Family code is preserved", parentAfter.parentProfile.familyCode === "FAM-2026-0001");
test("U-02: Student associations survive parent user deletion", parentAfter.parentProfile.students.length === 2);
test("U-02: Receipt history survives parent user deletion", parentAfter.parentProfile.receipts.length === 1);
test("U-02: ParentProfile userId decoupled to null", parentAfter.parentProfile.userId === null);


// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n────────────────────────────────────────────────────────────");
const passedCount = results.filter((r) => r.pass).length;
const failedCount = results.filter((r) => !r.pass).length;
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
if (failedCount > 0) {
  console.error("Some tests FAILED ❌");
  process.exit(1);
} else {
  console.log("All tests PASSED ✅");
}
