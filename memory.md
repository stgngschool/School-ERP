# School Finance OS - System Memory

This file serves as the long-term context memory for AI agents working on this project. It tracks the system architecture, seed states, credentials, logic rules, and historical changes.

---

## 1. Project Overview & Context
* **Project Name**: School Finance OS
* **Tech Stack**: Next.js (App Router), Prisma, PostgreSQL (Supabase), CSS, TypeScript.
* **Credentials**:
  * **Admin**: `admin` / `admin123`
  * **Accountant**: `accountant` / `accountant123`
  * **Teacher**: `teacher` / `teacher123`
  * **Parents**: `parent_<fatherMobile>` / `parent123`

---

## 2. Core Business Rules & Customizations

### A. Tuition Fees Structure
* **Classes KG to UKG**: ₹600.00 per month (60,000 Paisa).
* **Classes 1st to 8th**: ₹700.00 per month (70,000 Paisa).
* **Payment Database Format**: Stored as Integers in **Paisa** (Rs * 100) to avoid floating-point errors.
* **Months list**: Charged monthly for academic year months: `April, May, June, July, August, September, October, November, December, January, February, March`.

### B. Student Profiles & Fields
* The `Student` database model does **NOT** contain a `gender` field. Gender mapping for analytics in dashboard uses a dynamic first-name-based suffix heuristic combined with custom local school lists to compute male/female distribution (approx 265 girls, 352 boys in real cohort).
* **RTE Students**: Exempted from monthly tuition fee charges.
* **Sibling Groupings**: Tracked using a unique `familyCode` (e.g. `FAM-1`, `FAM-2`) under the `ParentProfile` model. A single parent is linked to a maximum of 4-5 students in sibling groups.

---

## 3. Implementation History (What is Built)

1. **Student Full Profile Modal**:
   * Fully functional premium glassmorphic slide-out/modal view for student profile tracking.
   * Access points added: Admin dashboard (View Details), Accountant dashboard (View Full Profile), Teacher dashboard (Click on student name).
   * Displays tabs: **Profile Info**, **Fees & Ledger**, **Attendance** (overall percentage widget), and **Leave Requests**.
2. **Bulk Data Migrations & Exporter**:
   * Pre-processed Excel worksheets (`Fee 26 Amit.xlsx`) containing 620 students and sibling groupings.
   * Parsed data with a robust helper script (`scratch/export_xlsx_to_json.py` + `scratch/migrate_json_to_db.ts`) with custom date-parsing for multiple styles (ISO, DD/MM/YYYY) and duplicate admission number suffix deduplication.
3. **Database Constraints & Optimizations**:
   * Added mapping grouping indexes inside API queries (`O(Charges + Discounts)`) to avoid CPU-blocking loop operations.
   * Secured ledger transactions searching in UI components (`AdminDashboard.tsx`, `AccountantDashboard.tsx`) with optional string-chaining on receipt numbers (`r.receiptNo?.toLowerCase()`).

---

## 4. Current Database State
* The database was reset on **July 15, 2026** to a clean testing state using the optimized mock dataset:
  * **Students**: 260 dynamic students with matching last names.
  * **Parents/Families**: 100+ parent profiles grouped by matching sibling contact phones.
  * **Ledger Billing Records**: ~7,200 entries.
  * **Receipts**: ~500 payments.
