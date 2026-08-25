# 🔍 School Finance OS — Deep Audit Report
**Date:** 2026-08-23 | **Files Audited:** 25+ | **Total Issues Found:** 90+

---

## 🔴 CRITICAL — Financial Risk / Data Corruption

| ID | Location | Issue |
|----|----------|-------|
| **B-01** | `api/billing/route.ts` | **Receipt number race condition** — `getNextReceiptNumber()` does read-max-then-increment without a DB lock. Two concurrent payments can get the same receipt number. One fails with a 500 silently losing the payment. |
| **B-02** | `api/billing/route.ts` | **Duplicate item double-payment** — No deduplication of `items[]`. Two items with same `ledgerEntryId` in one request will double-pay the same charge. |
| **B-03** | `api/billing/route.ts` L~581 | **Arrears calculation ignores prior partial payments** — `totalOriginalDues` uses full original charge amount without subtracting previous payments. If a charge was partially paid earlier, all future receipts show wrong (inflated) balance. |
| **S-01** | `api/students/route.ts` | **Admission number race condition** — Same TOCTOU pattern as B-01. Concurrent admissions get duplicate admission numbers → unique constraint crash. |
| **S-02** | `api/students/route.ts` L275-279 | **Roll number race condition** — Counts existing students then assigns `count + 1`. Concurrent admissions to same class get identical roll numbers. No unique constraint per class on roll number. |
| **LF-01** | `api/students/route.ts` | **Family/Admission code generated outside transaction** — Both `getNextAdmissionNumber()` and `getNextFamilyCode()` called before `db.$transaction`. Additional TOCTOU race on top of S-01. |
| **SCH-01** | `api/school/route.ts` | **School config saved to local JSON file** — `fs.writeFileSync` on Vercel's read-only serverless filesystem. Every school setting save (UPI ID, address, phone, receipt branding) **silently fails on production and resets on every redeploy.** |
| **GY-01** | `lib/generateYearlyCharges.ts` | **Bulk charge generation exceeds transaction timeout** — All students processed in one `db.$transaction`. For 100+ students this exceeds Prisma's 5-second default timeout, leaving **partial inconsistent ledger data.** |
| **F-01** | `api/fee-config/route.ts` L154-167 | **`ADD_STRUCTURE` for All classes runs synchronously** — Calls bulk generation for every student in one HTTP handler. Times out for 100+ students, leaving partial charge data. |
| **PD-01** | `ParentDashboard.tsx` L139-151 | **🚨 CRITICAL DATA EXPOSURE** — `parentStudents` filter is **logically inverted**. When `role === "PARENT"`, it returns ALL students in the system instead of only that parent's children. Every parent can see every other student's data. |
| **BL-01** | `api/billing/route.ts` | **No double-payment protection** — Two simultaneous payments for the same charge both succeed under READ COMMITTED isolation. Charge shows as overpaid with no alert or reversal. |

---

## 🟠 HIGH — Must Fix Before Next Release

| ID | Location | Issue |
|----|----------|-------|
| **B-04** | `api/billing/route.ts` | **Due dates hardcoded for 2026-27** — All charge due dates will be wrong next academic year. |
| **B-06** | `api/billing/route.ts` L371-372 | **Late fee base vs daily defaults inconsistent** — `lateFeeAmount ?? 50` for base, `lateFeeAmount ?? 5` for daily — different fallback values from same field. |
| **S-03** | `api/students/route.ts` | **RTE flag regenerates charges on every update** — Address change on an RTE student triggers full charge regeneration. Wasteful and risky. |
| **S-04** | `api/students/route.ts` | **Concession change doesn't regenerate charges** — New concession assigned → old full-price charges remain. Concession silently not applied. |
| **S-05** | `api/students/route.ts` | **Parent email changed without confirmation** — Silently overwrites parent login email with no verification or old-address notification. |
| **A-01** | `api/auth/login/route.ts` | **Rate limiter bypassed on serverless** — In-memory `rateLimitMap` per process. Vercel's multiple instances each have their own map → brute force bypasses limit by hitting different instances. |
| **A-02** | `src/lib/auth.ts` | **JWT has no server-side revocation** — 7-day token with no blacklist. Blocked users keep valid access for up to 7 days. |
| **GY-02** | `lib/generateYearlyCharges.ts` | **Bulk generator ignores `startingFeeMonth`** — Always generates all 12 months. Mid-year admits are overcharged for months before their join date. |
| **AC-01** | `AuthContext.tsx` L824 | **Transport amount double-divided** — `refreshTransportStops` divides by 100 (paisa→rupees), then `formatP()` divides again → displays 1/100th of real amount. |
| **AC-02** | `AuthContext.tsx` | **`apiFetch` caches empty-array responses** — Post-payment, stale empty-array state persists until force-refresh. |
| **AD-02** | `AccountantDashboard.tsx` L523 | **Fake random receipt numbers as fallback** — If server doesn't return receipt number: `` `REC-2026-${Math.floor(1000 + Math.random() * 9000)}` ``. Printed receipts with random/fake numbers are invalid financial documents. |
| **AD-03** | Both dashboards | **Month range display is misleading** — "April to December" shows even when only April, July, December were selected (non-consecutive). Incorrect on official voucher. |
| **PD-02** | `ParentDashboard.tsx` | **No double-submit guard on parent payment** — `handleSimulatePayment` has no `isSubmitting` flag. Rapid double-click fires two concurrent payments. |
| **BL-02** | `api/billing/route.ts` | **Discount not capped server-side** — Accountant can send `discountAmount > remaining balance`, creating negative dues in ledger. |
| **BL-03** | `api/billing/route.ts` | **Receipt arrears only cover selected invoices** — Receipt can print "All dues cleared" even when other family dues remain unpaid. |
| **RS-01** | `api/billing/route.ts` | **Old receipt reprints use live ledger data** — If `Receipt.remarks` JSON parse fails (old pre-fix receipts), amounts are recomputed from current ledger. Adjusted charges = different reprint amounts = legal/audit compliance issue. |
| **DB-02** | `prisma/schema.prisma` | **No cascade on `Receipt.studentId`** — Deleting student leaves orphaned receipts. |
| **DB-03** | `prisma/schema.prisma` | **No cascade on `ReceiptItem.ledgerEntryId`** — Deleting a `LedgerEntry` leaves orphaned ReceiptItems. |
| **DB-04** | `prisma/schema.prisma` | **`Receipt.status` is plain String** — "ACTIVE"/"REVERSED" not enforced by DB enum. Typos go undetected. |
| **DB-05** | `prisma/schema.prisma` | **`Class.status` is plain String** — Same issue as DB-04. |

---

## 🟡 MEDIUM — Important Fixes

### Auth & API
| ID | Issue |
|----|-------|
| **A-03** | BLOCKED user check in login route is unreachable dead code (two conflicting checks) |
| **A-04** | Logout doesn't verify caller is authenticated — allows CSRF-forced logout |
| **A-05** | `/api/auth/me` deletes cookies inside a GET handler — non-standard, may fail in caching environments |
| **A-06** | Admin switching to PARENT role can fuzzy-match other families' students |
| **F-04** | `GET /api/fee-config` auto-creates 5 default fee heads — side effect in a GET request |
| **C-01** | `GET /api/concessions` has **no auth check** — publicly readable |
| **T-01** | `GET /api/transport` has **no auth check** — publicly readable |
| **SCH-03** | `GET /api/school` has **no auth check** — UPI ID, phone, address, email readable by anyone |
| **AT-01** | TEACHER can bulk-mark attendance for **any student** in the system, not just their class |
| **AT-03** | Attendance session hardcoded to March 1st — should be April 1st (academic year start) |
| **U-02** | DELETE user returns "deleted cleanly" but only BLOCKs — account still exists |
| **U-03** | `employeeId` uses `Math.random()` — no uniqueness guarantee |
| **U-04** | Deleting a user destroys all their `AuditLog` entries — breaks compliance audit trails |
| **Multiple** | All API routes return **401** for authenticated users lacking role — should be **403 Forbidden** |

### Schema
| ID | Issue |
|----|-------|
| **DB-01** | `LedgerEntry.referenceId` is a plain String, not a FK — no referential integrity |
| **DB-06** | Missing index on `AcademicSession.isCurrent` — frequently queried, unindexed |
| **DB-07** | Missing index on `FeeAssignment.studentId` |
| **DB-08** | Missing composite index on `LedgerEntry[studentId, entryType, createdAt]` — most common billing query |
| **DB-09** | `Concession.percentage` is `Int` — fractional percentages impossible, silently truncated |
| **DB-10** | `Attendance.markedBy` is plain String with no FK — deleting user leaves dangling strings |
| **DB-11** | `Mark @@unique([studentId, subject, examName])` — no academic year scoping; second year marks overwrite first year marks for same exam name |

### AuthContext
| ID | Issue |
|----|-------|
| **AC-03** | `refreshData` fires multiple fetches fire-and-forget; dashboard shows "READY" before all data is loaded |
| **AC-04** | `addStudent` returns `undefined` on both success AND failure — calling component can't know if admission failed |
| **AC-05** | `generateBills` duplicates billing refresh logic instead of calling `refreshBilling()` |
| **SL-01** | User role cached in `localStorage` — client can spoof their role client-side |
| **SL-02** | `visibilitychange` re-verifies auth but does NOT refresh data — stale data shown after background period |

### Components
| ID | Issue |
|----|-------|
| **AD-01** | Receipt modal built from stale frontend state, not DB response |
| **AD-04** | Ledger tab silently shows only current user's entries (`createdByMe` hardcoded) — not obvious to admin |
| **AD-05** | **Export XLS / Export CSV are complete stubs** — call `alert("Exporting...")` only |
| **AD-07** | FIFO fee allocator sets all discounts to 0 — standing concessions not applied automatically |
| **B-07** | `subtotal`/`arrears` collapses to `amountPaid` when `remarks` JSON is missing and fallback equals paid |
| **B-09** | Fine CHARGE inflates total dues — fine's ReceiptItem links to fine LedgerEntry, not original charge |
| **GY-03** | N+1 queries inside billing POST transaction — `tx.ledgerEntry.findMany` called in a for-loop over items |
| **PD-03** | Marks fetched without `credentials: 'include'` — may silently fail |
| **PD-04** | Homework filter uses loose substring — Class "3" matches inside "Class 13" |
| **PD-05** | `getGroupedReceiptItems` is verbatim copy-pasted between AccountantDashboard and ParentDashboard |
| **PD-07** | Attendance pass rate counts LATE as present — may inflate % contrary to school policy |
| **LC-01** | `numberToIndianWords` ignores paise — receipts print wrong amount-in-words for non-round rupee amounts |
| **LF-02** | Family code uses calendar year not academic year — Jan 2027 admits get FAM-2027, inconsistent with April cohort |
| **LF-03** | `findMatchingParentProfile` fuzzy address threshold of 5 chars is too permissive — can merge unrelated families |
| **BL-04** | `isDueUpToCurrentMonth` returns `true` by default for non-monthly items — annual fees flagged as overdue before academic year begins |
| **BL-05** | RTE status set after charge generation leaves both full-fee and zero-fee charges for same student |
| **RS-03** | `dangerouslySetInnerHTML` for print CSS — fragile against data with CSS-breaking characters |
| **RS-04** | `window.print()` for student statement prints entire page, not just statement area |
| **AT-02** | `take: 2000` on attendance — silently truncates historical records |
| **B-05** | `paidGroups` query for PARENT/TEACHER fetches global data without student-scope filter |
| **B-10** | TEACHER role gets all billing data — no stated business need |
| **B-11** | `take: 300` on receipts with no skip/offset — oldest receipts inaccessible once total > 300 |
| **F-02** | `CLEANUP_DUPLICATES` may delete legitimate entries if charge descriptions match across years |

### Performance
| ID | Issue |
|----|-------|
| **P-02** | AuthContext loads ALL billing data on every login — 7,500+ records for 500 students |
| **P-03** | Hard `take` limits with no pagination on receipts and attendance |
| **P-04** | `unpaidStudents` and `dueItems` recomputed without memoization on every render |
| **P-06** | **AdminDashboard is 612KB** — no code-splitting |

---

## 🟢 LOW / Technical Debt

| ID | Issue |
|----|-------|
| **A-07** | `verifyToken` doesn't expose expiry time — can't show "Session expires in X mins" |
| **B-12** | No type validation on `items[].payAmount` — negative values possible |
| **DB-12** | `CalendarEvent.ticketsSold`, `pct` — event-ticketing fields in a school finance schema (dead/wrong context) |
| **SL-04** | Fixed 1.5s retry delays, no exponential backoff |
| **AC-06** | `refreshData` useCallback dep on `user` causes unnecessary recreation |
| **AC-07** | `AuthStage` has `"SUPABASE CLIENT CREATED"` — dead code from old Supabase migration |
| **PD-08** | `selectedChildId` initializes before students load — brief empty flash |
| **AD-09** | `validTabs` stale closure in `useEffect` |
| **AD-10** | "My Counter Balance" shows all-time total, not current-shift total |
| **LC-02** | `numberToIndianWords(0)` returns "Zero Rupees Only" — awkward on receipts |
| **WA-02** | WhatsApp reminder truncates dues list at 5 items |
| **C-02** | Concession percentage silently truncated via `parseInt` |
| **SCH-02** | `updateSchoolInfo` does GET-then-POST merge without lock — concurrent updates overwrite each other |

---

## 🗑️ Dead Code Summary

| Location | Dead Code |
|----------|-----------|
| `AuthContext.tsx` | `"SUPABASE CLIENT CREATED"` AuthStage — vestigial Supabase artifact |
| `AuthContext.tsx` | `generateBills` bypasses `refreshBilling()` with inline fetch+setState |
| `AccountantDashboard.tsx` L1809, 2102 | Export XLS/CSV buttons — complete non-functional stubs |
| `ParentDashboard.tsx` | `getGroupedReceiptItems` — verbatim copy-paste from AccountantDashboard |
| `billing/route.ts` | `getChargeDueDate()` hardcoded 2026-2027 |
| `students/route.ts` L132 | BLOCKED user check is unreachable dead code |

---

## Priority Fix Order

```
🔴 FIX NOW:     B-01, B-02, B-03, PD-01, BL-01, BL-02, SCH-01, GY-01, S-01, S-02, LF-01, F-01
🟠 THIS WEEK:   AD-02, AC-01, BL-03, RS-01, A-01, A-02, GY-02, DB-02, DB-03, DB-04, DB-05
🟡 THIS MONTH:  All Medium issues (auth 401→403, missing auth on public routes, N+1, caching, export stubs)
🟢 BACKLOG:     All Low/tech-debt items
```
