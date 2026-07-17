# School Finance OS - Development & Coding Rules

This document outlines the rules, styling guidelines, database patterns, and safety rules for developers and AI agents working on this project.

---

## 1. Database & Schema Rules

### A. Financial Calculations
* **Paisa Rule**: All currency and transaction values in the database MUST be stored as integers in **Paisa** (Rs. * 100). Do not use floats for monetary values.
* **Divide/Format in Frontend**: Convert Paisa to Rupees (`value / 100`) for display in the UI and format using standard Indian numbering system (`value.toLocaleString("en-IN")`).
* **Charges vs. Payments**: In the `LedgerEntry` model:
  * **EntryType.CHARGE**: Amount must be positive (increases outstanding balance).
  * **EntryType.PAYMENT**: Amount must be negative (reduces outstanding balance).
  * **EntryType.DISCOUNT**: Amount must be negative (discount/waiver).

### B. Uniqueness & Relations
* **Admission Number**: Must be unique in the `Student` table. Ensure duplicate admission numbers (from imports/inputs) are appended with deduplication suffixes (e.g., `-1`, `-2`).
* **Optional Chaining**: When searching or querying database strings (e.g. `receiptNo`, `parentPhone`) that can be optional or null, always use optional chaining (`?.toLowerCase()`) to prevent runtime TypeErrors.

---

## 2. API & Performance Rules

### A. Loop Optimization
* **No O(N^2) Scans**: Avoid nested scans over large arrays (like scanning all discounts/receipt items for every ledger entry). Group child records in memory using `Map` structures before looping.
* **Bulk Writes**: For bulk imports, do not use awaited sequential prisma write operations in loops. Collect structures in memory and execute batch queries using `createMany` (divided into chunks of 1000).

---

## 3. UI & Styling Guidelines

### A. Styling Conventions
* Use **Vanilla CSS / Custom CSS classes** for custom designs to maintain maximum flexibility.
* Do not import TailwindCSS utility classes on top of components unless specifically approved.
* Keep layouts fully responsive and adapt modal sheets to work on both mobile viewport and desktop screens.

### B. Aesthetics & Modern Looks
* Maintain the **premium, glassmorphic layout theme** with clean card designs, micro-hover animations, and vibrant accents.
* Always present statistics in a clean and grouped manner, using standard badges for statuses (`PAID` vs `UNPAID` or `APPROVED` vs `PENDING`).
