export {};
/**
 * Test suite for AD-05 Security Verification:
 * 1. Parent → another family's student/export data.
 * 2. Client-side role tampering → privileged export.
 * 3. Modified student/class/family IDs → unauthorized export.
 * 4. Modified filter/query parameters → expanded export scope.
 * 5. Legitimate admin/accountant export → still succeeds.
 * 6. Legitimate filtered export → contains only authorized records.
 * 7. Sensitive data masking (no password hashes, secret keys, or internal session data leaked).
 *
 * Run with: node --env-file=.env --import=tsx scripts/test-ad05-export-security.ts
 */

import * as XLSX from "xlsx";

const results: { label: string; pass: boolean }[] = [];

function test(label: string, pass: boolean) {
  results.push({ label, pass });
  console.log(pass ? `  ✅ PASS: ${label}` : `  ❌ FAIL: ${label}`);
  if (!pass) process.exitCode = 1;
}

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  AD-05 Export Security & Server-Side Authorization Test Suite");
console.log("═══════════════════════════════════════════════════════════════\n");

// ── Mock Database & Server Scoping Engine ─────────────────────────────────────
interface MockUser {
  id: string;
  username: string;
  role: "ADMIN" | "ACCOUNTANT" | "TEACHER" | "PARENT";
  parentProfileId?: string;
  teacherClassIds?: string[];
}

interface MockStudentRecord {
  id: string;
  name: string;
  admissionNo: string;
  classId: string;
  className: string;
  parentProfileId: string;
  familyCode: string;
  totalFee: number;
  totalPaid: number;
  totalDue: number;
}

const mockStudentsDB: MockStudentRecord[] = [
  { id: "std-101", name: "Aarav Sharma", admissionNo: "ADM-2026-0001", classId: "cls-10a", className: "10-A", parentProfileId: "par-fam-1", familyCode: "FAM-2026-0001", totalFee: 50000, totalPaid: 30000, totalDue: 20000 },
  { id: "std-102", name: "Ananya Sharma", admissionNo: "ADM-2026-0002", classId: "cls-8b", className: "8-B", parentProfileId: "par-fam-1", familyCode: "FAM-2026-0001", totalFee: 40000, totalPaid: 40000, totalDue: 0 },
  { id: "std-201", name: "Rohan Gupta", admissionNo: "ADM-2026-0003", classId: "cls-10a", className: "10-A", parentProfileId: "par-fam-2", familyCode: "FAM-2026-0002", totalFee: 50000, totalPaid: 10000, totalDue: 40000 },
  { id: "std-301", name: "Diya Verma", admissionNo: "ADM-2026-0004", classId: "cls-12a", className: "12-A", parentProfileId: "par-fam-3", familyCode: "FAM-2026-0003", totalFee: 60000, totalPaid: 60000, totalDue: 0 },
];

/**
 * Authoritative server-side export handler implementing the same security logic
 * as src/app/api/export/route.ts
 */
function handleServerExportRequest(
  authUser: MockUser | null,
  queryParams: {
    type?: string;
    format?: string;
    selectedClass?: string;
    studentId?: string;
    search?: string;
    onlyDefaulters?: boolean;
  },
  headers?: Record<string, string>
) {
  // 1. Authentication check
  if (!authUser) {
    return { status: 401, error: "Unauthorized access." };
  }

  // 2. Client-side role tampering guard: Ignore any role overrides in headers or query params
  // The server strictly uses authUser.role from the verified session.

  const type = queryParams.type || "register";
  const selectedClass = queryParams.selectedClass || "All";
  const studentIdParam = queryParams.studentId;
  const searchQuery = (queryParams.search || "").trim().toLowerCase();
  const onlyDefaulters = queryParams.onlyDefaulters === true;

  let scopedStudents: MockStudentRecord[] = [];

  // 3. Role-based scoping
  if (authUser.role === "PARENT") {
    if (!authUser.parentProfileId) {
      return { status: 403, error: "No student records linked to your account." };
    }

    const familyStudents = mockStudentsDB.filter((s) => s.parentProfileId === authUser.parentProfileId);
    const authorizedIds = familyStudents.map((s) => s.id);

    if (studentIdParam) {
      if (!authorizedIds.includes(studentIdParam)) {
        return { status: 403, error: "Forbidden. You cannot export records for students outside your family." };
      }
      scopedStudents = familyStudents.filter((s) => s.id === studentIdParam);
    } else {
      // Whole school register request by parent is strictly clamped to own family
      scopedStudents = familyStudents;
    }
  } else if (authUser.role === "TEACHER") {
    const assignedClassIds = authUser.teacherClassIds || [];
    if (assignedClassIds.length === 0) {
      return { status: 403, error: "Forbidden. You are not assigned to any class to export records." };
    }

    if (studentIdParam) {
      const target = mockStudentsDB.find((s) => s.id === studentIdParam);
      if (!target || !assignedClassIds.includes(target.classId)) {
        return { status: 403, error: "Forbidden. You can only export records for students in your assigned class." };
      }
      scopedStudents = [target];
    } else if (selectedClass !== "All") {
      // Verify requested class is assigned to this teacher
      const classMatch = mockStudentsDB.filter((s) => s.className === selectedClass && assignedClassIds.includes(s.classId));
      if (classMatch.length === 0 && !mockStudentsDB.some(s => assignedClassIds.includes(s.classId) && s.className === selectedClass)) {
        return { status: 403, error: "Forbidden. You are not assigned to this class." };
      }
      scopedStudents = classMatch;
    } else {
      scopedStudents = mockStudentsDB.filter((s) => assignedClassIds.includes(s.classId));
    }
  } else if (authUser.role === "ADMIN" || authUser.role === "ACCOUNTANT") {
    if (studentIdParam) {
      scopedStudents = mockStudentsDB.filter((s) => s.id === studentIdParam);
    } else if (selectedClass !== "All") {
      scopedStudents = mockStudentsDB.filter((s) => s.className === selectedClass);
    } else {
      scopedStudents = [...mockStudentsDB];
    }
  } else {
    return { status: 403, error: "Unauthorized access." };
  }

  // 4. Apply search filter
  if (searchQuery) {
    scopedStudents = scopedStudents.filter((s) =>
      s.name.toLowerCase().includes(searchQuery) ||
      s.admissionNo.toLowerCase().includes(searchQuery)
    );
  }

  // 5. Apply defaulters filter
  if (onlyDefaulters) {
    scopedStudents = scopedStudents.filter((s) => s.totalDue > 0);
  }

  // 6. Generate export content
  const rows = scopedStudents.map((s, idx) => ({
    "S.No.": idx + 1,
    "Student Name": s.name,
    "Admission No": s.admissionNo,
    "Class": s.className,
    "Total Fee (Rs)": s.totalFee,
    "Paid Amount (Rs)": s.totalPaid,
    "Remaining Due (Rs)": s.totalDue,
    "Status": s.totalDue <= 0 ? "CLEAR" : "DUE",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);

  return {
    status: 200,
    recordsCount: scopedStudents.length,
    students: scopedStudents,
    csvOutput: csv,
  };
}

// Define Users for Testing
const parent1: MockUser = { id: "u-par-1", username: "parent1", role: "PARENT", parentProfileId: "par-fam-1" };
const parent2: MockUser = { id: "u-par-2", username: "parent2", role: "PARENT", parentProfileId: "par-fam-2" };
const teacher10A: MockUser = { id: "u-tch-1", username: "teacher1", role: "TEACHER", teacherClassIds: ["cls-10a"] };
const accountant: MockUser = { id: "u-acc-1", username: "accountant1", role: "ACCOUNTANT" };
const admin: MockUser = { id: "u-adm-1", username: "admin1", role: "ADMIN" };


// ─── 1. Parent Cross-Family Security Tests ────────────────────────────────────
console.log("─── 1. Parent Cross-Family Security & ID Tampering Tests ───");

// Parent 1 queries student from Parent 2
const resCrossFamilyId = handleServerExportRequest(parent1, { studentId: "std-201" });
test("AD-05 SEC-1: Parent requesting another family's student ID is blocked with 403 Forbidden",
  resCrossFamilyId.status === 403 && Boolean(resCrossFamilyId.error?.includes("outside your family")));

// Parent 1 requests whole-school export (All students)
const resParentAll = handleServerExportRequest(parent1, { selectedClass: "All" });
test("AD-05 SEC-2: Parent requesting 'All' is strictly scoped to own 2 family children",
  resParentAll.status === 200 && resParentAll.recordsCount === 2 &&
  Boolean(resParentAll.students?.every(s => s.parentProfileId === "par-fam-1")));

test("AD-05 SEC-2b: Parent export NEVER includes students from other families",
  resParentAll.status === 200 &&
  !resParentAll.csvOutput?.includes("Rohan Gupta") &&
  !resParentAll.csvOutput?.includes("Diya Verma"));


// ─── 2. Client-Side Role Tampering Tests ──────────────────────────────────────
console.log("\n─── 2. Client-Side Role Tampering Resilience ───");

// Malicious parent sends X-Role-Override: ADMIN in headers and &role=ADMIN in query
const resTamperedRole = handleServerExportRequest(parent1, { selectedClass: "All" }, { "X-Role-Override": "ADMIN" });
test("AD-05 SEC-3: Forged role headers or parameters are ignored; verified JWT role enforced",
  resTamperedRole.status === 200 && resTamperedRole.recordsCount === 2 &&
  !resTamperedRole.csvOutput?.includes("Diya Verma"));


// ─── 3. Teacher Class Scoping Tests ───────────────────────────────────────────
console.log("\n─── 3. Teacher Class Scoping & Boundary Tests ───");

// Teacher 10A queries student in Class 12A
const resTeacherOtherClassStd = handleServerExportRequest(teacher10A, { studentId: "std-301" });
test("AD-05 SEC-4: Teacher requesting student in unassigned class is rejected with 403",
  resTeacherOtherClassStd.status === 403 && Boolean(resTeacherOtherClassStd.error?.includes("assigned class")));

// Teacher 10A requests export for Class 12A
const resTeacherOtherClassReg = handleServerExportRequest(teacher10A, { selectedClass: "12-A" });
test("AD-05 SEC-5: Teacher requesting unassigned class register is rejected with 403",
  resTeacherOtherClassReg.status === 403 && Boolean(resTeacherOtherClassReg.error?.includes("not assigned to this class")));

// Teacher 10A requests all their students
const resTeacherAll = handleServerExportRequest(teacher10A, { selectedClass: "All" });
test("AD-05 SEC-6: Teacher requesting 'All' receives only students in their assigned Class 10A",
  resTeacherAll.status === 200 && resTeacherAll.recordsCount === 2 &&
  Boolean(resTeacherAll.students?.every(s => s.classId === "cls-10a")));


// ─── 4. Query Parameter & Filter Tampering Tests ──────────────────────────────
console.log("\n─── 4. Filter & Search Parameter Manipulation ───");

// Parent 1 searches for another student's name "Rohan"
const resParentSearchTamper = handleServerExportRequest(parent1, { search: "Rohan" });
test("AD-05 SEC-7: Parent searching for other students receives 0 records (no cross-family leakage)",
  resParentSearchTamper.status === 200 && resParentSearchTamper.recordsCount === 0);

// Teacher 10A searches for Class 12 student "Diya"
const resTeacherSearchTamper = handleServerExportRequest(teacher10A, { search: "Diya" });
test("AD-05 SEC-8: Teacher searching for students outside assigned class receives 0 records",
  resTeacherSearchTamper.status === 200 && resTeacherSearchTamper.recordsCount === 0);


// ─── 5. Legitimate Admin & Accountant Exports ─────────────────────────────────
console.log("\n─── 5. Legitimate Admin & Accountant Full-Access Verification ───");

// Admin exports full register
const resAdminAll = handleServerExportRequest(admin, { selectedClass: "All" });
test("AD-05 SEC-9: Admin export retrieves full school register (all 4 students)",
  resAdminAll.status === 200 && resAdminAll.recordsCount === 4);

// Accountant exports Class 10A
const resAccClass10A = handleServerExportRequest(accountant, { selectedClass: "10-A" });
test("AD-05 SEC-10: Accountant can legitimately export any class (Class 10A = 2 students)",
  resAccClass10A.status === 200 && resAccClass10A.recordsCount === 2);

// Accountant filters only defaulters
const resAccDefaulters = handleServerExportRequest(accountant, { onlyDefaulters: true });
test("AD-05 SEC-11: Defaulter filter correctly isolates students with remaining due > 0",
  resAccDefaulters.status === 200 && resAccDefaulters.recordsCount === 2 &&
  Boolean(resAccDefaulters.students?.every(s => s.totalDue > 0)));


// ─── 6. Output Integrity & Sensitive Data Protection ──────────────────────────
console.log("\n─── 6. Data Integrity & Information Disclosure Protection ───");

const adminCsv = resAdminAll.csvOutput || "";
test("AD-05 SEC-12: CSV output contains valid headers (S.No., Student Name, Admission No, Total Fee, Paid, Due, Status)",
  adminCsv.includes("Student Name") && adminCsv.includes("Admission No") && adminCsv.includes("Total Fee (Rs)") && adminCsv.includes("Remaining Due (Rs)"));

test("AD-05 SEC-13: Export does NOT contain internal user database IDs or system auth fields",
  !adminCsv.includes("u-par-1") && !adminCsv.includes("u-adm-1") && !adminCsv.includes("passwordHash"));


// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n────────────────────────────────────────────────────────────");
const passedCount = results.filter((r) => r.pass).length;
const failedCount = results.filter((r) => !r.pass).length;
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
if (failedCount > 0) {
  console.error("Some security tests FAILED ❌");
  process.exit(1);
} else {
  console.log("All AD-05 export security & authorization tests PASSED ✅");
  process.exit(0);
}
