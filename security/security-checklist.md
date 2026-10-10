# Security Checklist
## Project: School Finance OS

---

## 1. Code Review & PR Security Checklist

Before merging any code change or committing updates, developers and AI agents must verify:

- [ ] **Zero Hardcoded UPI IDs**:
  - Run `git grep -i "8423926608"`.
  - Verify that if `school.upiId` is empty, QR creation and UPI submission are safely disabled with an amber warning.
- [ ] **Integer Paisa Currency Math**:
  - No direct floating-point multiplication (`* 100`) or raw addition for fee balances.
  - All currency calculations use `toPaisa()` and display via `formatP()`.
- [ ] **IST Timezone Compliance**:
  - No `toISOString().split('T')[0]` used for daily timestamps or receipt dates.
  - Indian Standard Time utility (`getTodayIST()`) must be used.
- [ ] **Cache Size Bounded**:
  - All in-memory caches must enforce a maximum size limit (e.g. `BoundedCache(50)`).
- [ ] **Zero Secret Commits**:
  - Confirm `.env.local` is untracked by Git (`git status --ignored`).
- [ ] **Clean Typecheck**:
  - `npx tsc --noEmit` exits with code `0`.

---

## 2. Pre-Deployment Production Checklist

- [ ] `JWT_SECRET` is set to a secure, randomly generated string in production environment.
- [ ] Default administrator credentials (`admin` / default password) have been updated.
- [ ] School profile (`school.json`) contains the school's verified official UPI VPA and contact details.
- [ ] Inactive / test student records and dummy receipts have been cleared or archived.
- [ ] Production assets are compressed (e.g. `public/logo.webp` < 100KB).
- [ ] Safe-delete policy is enabled (Receipts can only be reversed, not hard-deleted).

---

## 3. Routine Weekly Operational Audit

| Check | Frequency | Verification Method |
| :--- | :--- | :--- |
| **Cash vs Receipts Tally** | Daily | Compare physical cash drawer with Daybook ledger totals |
| **JSON Backups** | Weekly | Confirm automated snapshot exists in `/backups/` |
| **Locked Exams Audit** | Monthly | Ensure finalized term exams are listed in `schoolInfo.lockedExams` |
| **Staff Access Review** | Monthly | Revoke inactive staff accounts via `isActive: false` |
