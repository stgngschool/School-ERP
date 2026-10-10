# Attack Surface Analysis
## Project: School Finance OS

---

## 1. Attack Surface Overview

The School Finance OS attack surface comprises API routes, client-side browser state, local file storage, and network boundaries.

---

## 2. API Endpoint Inventory & Exposure Matrix

| Endpoint | Method | Required Role | Risk Level | Validation & Guards |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public | High | Rate-limited, salted password verification, sets HttpOnly cookie |
| `/api/auth/me` | `GET` | Authenticated | Medium | Validates `tokenVersion` against user database |
| `/api/auth/logout` | `POST` | Authenticated | Low | Clears session cookie and increments `tokenVersion` |
| `/api/billing` | `GET`, `POST` | Authenticated | Critical | Validates integer Paise, generates sequential receipt numbers |
| `/api/billing/[id]/reverse`| `POST` | `ADMIN` / `ACCOUNTANT`| High | Audit log required, marks receipt `REVERSED` without deletion |
| `/api/students` | `GET`, `POST` | Authenticated | High | Sanitizes student payload, validates phone & admission number |
| `/api/marks` | `GET`, `POST` | Authenticated | High | Evaluates against `lockedExams` list; rejects if exam is locked |
| `/api/marks/export` | `GET` | Authenticated | Medium | Generates CSV/Excel files; prevents formula injection (`=`, `@`, `+`) |
| `/api/school` | `GET`, `POST` | `ADMIN` Only | Critical | Strict admin verification before modifying UPI VPA or school data |
| `/api/users` | `GET`, `POST` | `ADMIN` Only | Critical | Admin only; prevents self-deletion and verifies role hierarchy |

---

## 3. Client-Side Attack Surface

### 3.1 Browser `localStorage`
- **Data Stored**:
  - `offline_marks_roster_*`: Draft student marks for crash recovery.
  - `privacy_mode_state`: Boolean privacy visibility toggle.
  - `students_import_mode`: UI toggle state.
- **Security Rule**:
  - Never store plain text passwords, JWT tokens, or raw private keys in `localStorage`.
  - Stored drafts are scoped strictly per school session and validated before submitting to server APIs.

### 3.2 CSV / Excel Export Formula Injection (CSV Injection)
- **Vector**: A malicious student name formatted like `=cmd|' /C calc'!A0` could execute arbitrary code when an administrator opens the CSV in Microsoft Excel.
- **Countermeasure**:
  - All text fields exported to CSV/Excel must be sanitized by prefixing single quotes (`'`) if starting with `=`, `+`, `-`, or `@`.

---

## 4. HTTP Headers & Transport Protections

1. **HttpOnly & Secure Cookies**: Authentication tokens are strictly isolated from client-side JavaScript execution via `HttpOnly; SameSite=Lax; Secure`.
2. **CORS Boundary**: All API endpoints restrict cross-origin requests to trusted same-origin school instances.
3. **No Dynamic Code Evaluation**: Codebase prohibits `eval()`, `new Function()`, or unescaped `dangerouslySetInnerHTML`.
