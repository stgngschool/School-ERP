# Data Handling & Privacy Policy
## Project: School Finance OS

---

## 1. Data Classification Matrix

| Data Classification | Examples | Storage Location | Access Controls | Masking & Protection |
| :--- | :--- | :--- | :--- | :--- |
| **Class 1: Highly Confidential** | Password hashes, JWT secrets, UPI private keys | `.env.local`, `users.json` | Server-Side Only | Never sent to client; salted hashing (Argon2 / Scrypt) |
| **Class 2: Financial Confidential** | Daily collections, total dues, counter cash tally | `billing.json` | Staff Roles (`ADMIN`, `ACCOUNTANT`) | Masked on-screen via Global Privacy Mode (`₹••••••`) |
| **Class 3: Student & Parent PII** | Parent mobile numbers, home addresses, student DOB | `students.json` | Staff Roles (`ADMIN`, `ACCOUNTANT`, `TEACHER`) | Transmitted over secure TLS; no public scraping |
| **Class 4: Operational Data** | Class names, subjects, circulars, timetables | `school.json` | All Internal Users | Read-only for non-administrative roles |

---

## 2. On-Screen Financial Privacy Protection (Privacy Mode)

In busy school admission offices, parents frequently lean over the accountant's desk while paying fees.

- **Feature**: `Global Privacy Mode` toggle (Eye Icon in Quick Command Hub and KPI cards).
- **Behavior**:
  - Automatically obfuscates sensitive currency metrics:
    - Collected Revenue: `₹••••••`
    - Pending Dues: `₹••••••`
    - Cash / UPI Counter Totals: `₹••••••`
    - Top Defaulters Outstanding: `₹••••••`
  - Individual card toggles (`PrivacyEyeButton`) allow the cashier to temporarily unmask a single metric without revealing the school's total earnings.

---

## 3. Data Sanitization & Logging Rules

1. **Zero Secret Logging**:
   - `console.log` and error handlers must NEVER output raw passwords, bearer tokens, or JWT payloads.
2. **Safe Error Responses**:
   - API error responses return structured, generic messages (e.g. `{ error: "Invalid credentials" }`) rather than full server stack traces or database file paths.
3. **Receipt Storage & Integrity**:
   - Financial ledger entries are append-only. No raw overwrites without versioning and timestamps.
