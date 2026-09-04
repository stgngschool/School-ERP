# 🔍 School Finance OS — Deep Audit Report

**Date:** 3 September 2026  
**Auditor:** Antigravity AI  
**Scope:** Full system — Admin, Teacher, Parent, Accountant, APIs, Database, Security, PWA, UI

---

## Summary at a Glance

| Severity | Count |
|----------|-------|
| 🔴 **CRITICAL** (data loss, security, money) | 8 |
| 🟠 **HIGH** (broken features, wrong calculations) | 12 |
| 🟡 **MEDIUM** (UX bugs, edge cases) | 15 |
| 🔵 **LOW** (minor issues, improvements) | 10 |
| **TOTAL** | **45** |

---

## 🔴 CRITICAL ISSUES (Fix Immediately)

---

### C-01: `.env` File Contains Real Production Secrets in Git

**File:** [.env](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/.env)

> [!CAUTION]
> The `.env` file contains REAL production credentials in the repository:
> - **Database URL** with full password: `SchoolFinanceOS@2026!`
> - **JWT Secret**: `SchoolFinanceOSSecretKey2026` (only 28 chars, easily guessable)
> - **Google Service Account Private Key** (full RSA key)
> - **Supabase Anon Key**

**Impact:** If this repo is ever public or accessed by unauthorized person, ALL school data (620 students, financial records, personal info including Aadhaar) is fully compromised.

**Fix:** 
1. Rotate ALL these credentials immediately
2. Add `.env` to `.gitignore` (if not already done correctly)
3. Use a stronger random JWT_SECRET (min 64 chars)
4. Never commit private keys to git

---

### C-02: Unbounded In-Memory Cache = DoS / OOM Crash

**Files:** 
- [billing/route.ts:13-14](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/app/api/billing/route.ts#L13-L14)
- [students/route.ts:12-13](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/app/api/students/route.ts#L12-L13)

```typescript
const serverBillingCache = new Map<string, { data: any; timestamp: number }>();
const cacheKey = `${authUser.role}_${authUser.userId}_${request.url}`;
```

> [!CAUTION]
> Both billing and students APIs use **unbounded** `Map()` for caching, keyed by **full request URL**. An attacker can crash the server by sending random query params (`?q=1`, `?q=2`, etc.), creating unlimited cache entries until the Node.js process runs Out of Memory.

**Impact:** Server crash, all users affected.

**Fix:** Add max cache size (LRU), or replace with Redis/Next.js cache. Normalize cache keys to strip random params.

---

### C-03: Floating-Point Bug in Financial Amount Calculations

**File:** [ExpenseRegister.tsx:35-36](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/ExpenseRegister.tsx#L35-L36)

```typescript
amount: parseFloat(amount) * 100, // DANGEROUS!
```

> [!CAUTION]
> `parseFloat("19.99") * 100` = `1998.9999999999998`, NOT `1999`. For a financial application, this causes paisa-level discrepancies across all expense records.

**Impact:** Wrong amounts stored in database, ledger imbalances, audit failures.

**Fix:** Use `Math.round(parseFloat(amount) * 100)` or the existing `toPaisa()` utility.

---

### C-04: NaN Bypass in Student Profile Custom Charge

**File:** [StudentProfileModal.tsx:49](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/StudentProfileModal.tsx#L49)

```typescript
if (!chargeTitle || !chargeAmount || parseFloat(chargeAmount) <= 0) return;
```

**Bug:** If user types `"abc"`, `parseFloat("abc")` returns `NaN`. `NaN <= 0` is `false`. The guard is bypassed and an invalid NaN payload is sent to the server, causing a 500 crash or corrupt ledger entry.

**Fix:** Add `isNaN(Number(chargeAmount))` check before proceeding.

---

### C-05: Fake UPI ID in Parent Payment QR Code

**File:** [ParentFinanceTab.tsx:151-153](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/parent/ParentFinanceTab.tsx#L151-L153)

```typescript
const upiId = schoolInfo?.upiId || "school@upi";
```

> [!CAUTION]
> If school hasn't configured their UPI VPA, parents will see a QR code pointing to `school@upi` — a dummy/invalid UPI ID. Parents scanning this will either get a failed transaction or potentially send money to an unrelated account.

**Fix:** Disable the QR/Pay button when `schoolInfo?.upiId` is not set. Show a message: "UPI payment not configured."

---

### C-06: Auth/Me Endpoint Skips Token Version Check

**File:** [auth/me/route.ts:36-41](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/app/api/auth/me/route.ts#L36-L41)

```typescript
const decoded = verifyToken(token);
// ...
// Missing: No tokenVersion check like getAuthUser() does!
```

**Bug:** The `/api/auth/me` endpoint calls `verifyToken()` directly instead of `getAuthUser()`. This means it **skips** the token version revocation check. A user who was blocked or had their password reset will STILL appear as authenticated on the `/me` endpoint until their JWT naturally expires (7 days!).

**Impact:** Blocked users remain logged in. Password resets don't force re-login on the session validation path.

**Fix:** Replace `verifyToken(token)` with `getAuthUser(request)` to include DB-level token version checks.

---

### C-07: Student.status Is a Raw String, Not an Enum

**File:** [schema.prisma:176](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/prisma/schema.prisma#L176)

```prisma
status          String          @default("ACTIVE") // "ACTIVE", "LEFT"
```

**Bug:** While `Class.status` was migrated to a proper enum (`ClassStatus`), `Student.status` is still a plain `String`. Any API can accidentally insert `"active"`, `"Active"`, `"INACTIVE"`, or any garbage value. No database-level protection.

Similarly: `FeeHead.status`, `Notice.category`, `Notice.target`, `AdmissionEnquiry.status`, `AdmissionApplication.status`, `FeeStructure.frequency` — all raw strings with no enum constraint.

---

### C-08: Concession Discount Applied via Substring Match

**File:** [FeeCollectTab.tsx:169](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/accountant/FeeCollectTab.tsx#L169)

```typescript
const feeHeadMatches = due.name.toLowerCase().includes(concession.feeHeadName.toLowerCase());
```

> [!CAUTION]
> If a concession is configured for fee head `"Tuition"`, it will also accidentally match `"Late Tuition Fine"`, `"Tuition Arrears"`, `"Extra Tuition"` etc. — giving wrong discounts on charges that shouldn't be discounted.

**Impact:** Incorrect fee calculations, revenue loss.

**Fix:** Use strict equality (`===`) or match by `feeHeadId`.

---

## 🟠 HIGH SEVERITY ISSUES

---

### H-01: Systemic UTC Timezone Bug — "Today" Is Wrong Before 5:30 AM

**Files:** 9+ files affected  
**Key locations:**
- [TeacherDashboard.tsx:142](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/TeacherDashboard.tsx#L142)
- [AccountantDashboard.tsx:143](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/AccountantDashboard.tsx#L143)
- [AttendanceConsole.tsx:38](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/AttendanceConsole.tsx#L38)
- [ModernDatePicker.tsx:125](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/ModernDatePicker.tsx#L125)
- [AdmissionLeadsDesk.tsx:201](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/AdmissionLeadsDesk.tsx#L201)

```typescript
const todayDateStr = new Date().toISOString().split("T")[0]; // ← UTC, not IST!
```

**Bug:** `.toISOString()` returns UTC. India is UTC+5:30. Between 12:00 AM and 5:29 AM IST, this returns **yesterday's** date. This means:
- ❌ Attendance gets marked for the **wrong date** (yesterday)
- ❌ "Today" highlights the wrong day in the calendar
- ❌ Receipt dates are off by one day
- ❌ Admission dates are wrong

**Count:** Found **50+ instances** across the codebase.

**Fix:** Use `new Date().toLocaleDateString('en-CA')` which returns local `YYYY-MM-DD`.

---

### H-02: AdminDashboard.tsx Is 653KB / 11,300 Lines — Unmaintainable

**File:** [AdminDashboard.tsx](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/AdminDashboard.tsx)

**Problem:** This single file is **653KB** with **11,300 lines** of code. It contains:
- ~100+ `useState` hooks
- Dashboard, students, fees, billing, users, notices, audit, school config, Google integration, attendance, marks, ID cards — ALL in one file
- Multiple inline form handlers
- Massive JSX render tree

**Impact:** 
- Extremely slow IDE/HMR performance
- React re-renders the entire 11K-line tree on any state change
- Impossible to debug or maintain
- Very high memory pressure on client devices

---

### H-03: WhatsApp Link Fails for 11-Digit Phone Numbers

**File:** [AccountantDashboard.tsx:126-127](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/AccountantDashboard.tsx#L126-L127)

```typescript
const numericPhone = phone.replace(/\D/g, "");
const finalPhone = numericPhone.length === 10 ? `91${numericPhone}` : numericPhone;
```

**Bug:** Indian phone with leading `0` (e.g., `09876543210`) becomes `09876543210` (11 digits). Since `length !== 10`, no country code is prepended. WhatsApp API call fails with invalid number.

---

### H-04: Accountant "My Receipts" Filter Is Fragile

**File:** [AccountantDashboard.tsx:137-142](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/AccountantDashboard.tsx#L137-L142)

```typescript
const myReceipts = receipts.filter(
  (r) =>
    r.collectedBy === user?.name ||
    r.collectedBy === user?.email ||
    r.collectedBy === "Accountant"
);
```

**Bug:** Filtering by display name string comparison is unreliable. If admin's name matches, wrong count. If name changes, history breaks. Should filter by `r.createdById === user?.id`.

---

### H-05: Service Worker May Cache Financial API Responses

**File:** [sw.ts:21-23](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/app/sw.ts#L21-L23)

```typescript
...defaultCache.filter((cacheRule) => {
  return !cacheRule.matcher.toString().includes("api");
}),
```

**Bug:** `cacheRule.matcher.toString()` on a compiled regex/function may not contain the literal string `"api"`. After minification, the filter silently fails and financial endpoints get aggressively cached by the service worker — parents and accountants see stale payment data.

---

### H-06: Hardcoded Quick Filters Based on String Matching

**File:** [FeeCollectTab.tsx:252-282](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/accountant/FeeCollectTab.tsx#L252-L282)

```typescript
if (type === "Q1") {
  targetDues = childDues.filter((d) => {
    const name = d.name.toLowerCase();
    return (name.includes("april") || name.includes("may") ...);
  });
}
```

**Bug:** Quarter filters rely on English month names being present in charge descriptions. If admin creates charges with different naming convention (e.g., "Apr Fee" or Hindi names), quick filters silently return empty results.

---

### H-07: State Race Condition in ExpenseRegister

**File:** [ExpenseRegister.tsx:40](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/ExpenseRegister.tsx#L40)

```typescript
setExpenses([newExpense, ...expenses]); // Race condition!
```

**Bug:** Uses stale `expenses` closure. If user adds two expenses rapidly before React re-renders, the first addition is lost.

**Fix:** `setExpenses((prev) => [newExpense, ...prev]);`

---

### H-08: BottomSheet Swipe-to-Dismiss Broken on Mobile

**File:** [BottomSheet.tsx:64-67](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/BottomSheet.tsx#L64-L67)

```typescript
if (e.cancelable) {
  // e.preventDefault(); // Removed to prevent passive listener warning
}
```

**Bug:** Without `preventDefault()`, dragging the bottom sheet triggers native page scroll / pull-to-refresh, making it impossible to dismiss via touch swipe on mobile.

---

### H-09: AdmissionLeadsDesk Crashes on Null `enrolledStudent`

**File:** [AdmissionLeadsDesk.tsx:622](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/AdmissionLeadsDesk.tsx#L622)

```typescript
ADM No: <strong>{app.enrolledStudent.admissionNumber}</strong>
```

**Bug:** If `app.enrolledStudent` is `null` (admission not yet processed or data not loaded), this throws a React fatal error and crashes the entire Admissions tab.

**Fix:** `app.enrolledStudent?.admissionNumber`

---

### H-10: Missing `setActiveTab` in `useEffect` Dependencies

**File:** [TeacherDashboard.tsx:68-72](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/TeacherDashboard.tsx#L68-L72)
**Also:** [ParentDashboard.tsx:60-64](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/ParentDashboard.tsx#L60-L64)

```typescript
React.useEffect(() => {
  if (!validTabs.includes(activeTab)) {
    setActiveTab("attendance");
  }
}, [activeTab]); // ← Missing setActiveTab + validTabs in deps
```

**Bug:** `setActiveTab` and `validTabs` are missing from the dependency array. React will warn about this and the effect may use stale closures. Also, `validTabs` is recreated every render (not memoized/static), causing unnecessary effect reruns.

---

### H-11: No CSRF Protection on Mutation API Endpoints

All POST/PATCH/DELETE API routes accept requests with just the `auth_token` cookie — no CSRF token verification. Since cookies are sent automatically by the browser, a malicious website could craft a form POST to `/api/billing` and make payments or create charges using the victim's session.

---

### H-12: `jsonwebtoken` AND `jose` Both Installed

**File:** [package.json:18-19](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/package.json#L18-L19)

```json
"jose": "^6.2.3",
"jsonwebtoken": "^9.0.3",
```

Both JWT libraries are installed but only `jsonwebtoken` is used. `jose` is a dead dependency adding bundle size.

---

## 🟡 MEDIUM SEVERITY ISSUES

---

### M-01: Parent Attendance Rate Counts "Late" as "Present"

**File:** [ParentDashboard.tsx:77](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/ParentDashboard.tsx#L77)

```typescript
const attendanceRate = totalDays > 0 ? Math.round(((presentDays + leaveDays + lateDays) / totalDays) * 100) : 100;
```

**Issue:** "LEAVE" and "LATE" days are counted as attendance. A student who was late every day and absent 0 days shows 100% attendance. Also, a student with 0 records shows 100% (default fallback).

---

### M-02: TeacherDashboard Doesn't Code-Split Heavy Components

**File:** [TeacherDashboard.tsx:26-29](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/TeacherDashboard.tsx#L26-L29)

```typescript
import StudentProfileModal from "@/components/StudentProfileModal"; // 68KB
import MarksFeedingConsole from "@/components/MarksFeedingConsole"; // 56KB
import AttendanceConsole from "@/components/AttendanceConsole"; // 26KB
```

**Issue:** Admin dashboard correctly uses `dynamic(() => import(...))` for these heavy components, but TeacherDashboard imports them statically, loading 150KB+ of JS even if teacher never opens those tabs.

---

### M-03: Notes Stored Only in LocalStorage (Admin Dashboard)

**File:** [AdminDashboard.tsx:169-197](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/AdminDashboard.tsx#L169-L197)

Admin's personal notes are stored only in `localStorage`. If admin logs in from a different browser or clears browser data, all notes are permanently lost. No backup, no sync.

---

### M-04: Google Spreadsheet ID Stored in LocalStorage Only

**File:** [AdminDashboard.tsx:484-487](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/AdminDashboard.tsx#L484-L487)

```typescript
setGoogleSpreadsheetId(localStorage.getItem("g_sheet_id") || "");
setGoogleFolderId(localStorage.getItem("g_drive_folder_id") || "");
```

**Issue:** Google integration config is device-specific and will be lost on browser change, private mode, or clearing storage.

---

### M-05: Teacher Can See All Students' Classes (Not Just Their Own)

**File:** [TeacherDashboard.tsx:98-103](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/TeacherDashboard.tsx#L98-L103)

```typescript
if (students.length > 0) {
  students.forEach((s) => {
    const key = getCleanClassKey(s.class, s.section);
    if (key) classSet.add(key);
  });
}
```

**Issue:** If the students API returns all school students (which it does for teachers), the teacher's class dropdown shows ALL classes, not just their assigned ones. A teacher assigned to "10-A" can view students of "8-B" through the UI dropdown.

---

### M-06: `CalendarEvent` Model Has Unexplained Fields

**File:** [schema.prisma:458-468](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/prisma/schema.prisma#L458-L468)

```prisma
ticketsSold String?  // e.g. "561 / 650"
pct         String?  // e.g. "86%"
```

**Issue:** A school calendar event model has `ticketsSold` and `pct` fields — these seem to be leftover from a different project template. Storing percentages as strings (`"86%"`) instead of numbers is also bad practice.

---

### M-07: No Server-Side Validation of `paymentMethod` Enum

**File:** [billing/route.ts:664](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/app/api/billing/route.ts#L664)

The billing POST handler accepts `paymentMethod` from the request body but never validates that it's a valid `PaymentMethod` enum value. A client can send `"BITCOIN"` and it may cause a Prisma validation error at the database level rather than a clean 400 response.

---

### M-08: Mobile Layout Shift on Card Press

**File:** [globals.css:333-335](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/app/globals.css#L333-L335)

```css
.mobile-card:active {
  transform: scale(0.985);
}
```

**Issue:** `scale()` on grid cards without a wrapper causes adjacent elements to shift on touch, creating visual jitter.

---

### M-09: PWA Manifest Missing Dual-Purpose Icons

**File:** [manifest.ts](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/app/manifest.ts)

Some icons specify `purpose: 'any'` while others use `purpose: 'maskable'`. Modern Android requires `purpose: 'any maskable'` on the same icon to properly generate adaptive icons.

---

### M-10: Proxy/Middleware Dot-in-URL Bypass

**File:** [proxy.ts:39](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/proxy.ts#L39)

```typescript
"/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
```

The regex `.*\\.` skips any route containing a dot. If a dynamic route or username contains a dot (e.g., `/enquiries/lead.name`), middleware/auth checks are completely bypassed.

---

### M-11: Receipt Reversal Doesn't Check `targetReceipt.remarks` for Valid JSON

**File:** [billing/route.ts:768](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/app/api/billing/route.ts#L768)

```typescript
const remarksObj = targetReceipt.remarks ? JSON.parse(targetReceipt.remarks) : {};
```

If `remarks` contains invalid JSON (possible from manual edits), `JSON.parse` throws and the entire reversal transaction fails with a 500 error and no meaningful error message.

---

### M-12: No Pagination on Admin Audit Logs Tab

Audit logs are loaded as `auditLogs` from context without pagination. As the system grows, this array becomes massive, causing the admin audit tab to freeze or crash.

---

### M-13: Homework History Never Paginated

**File:** [TeacherDashboard.tsx:179-181](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/TeacherDashboard.tsx#L179-L181)

All homework records for all classes are loaded into client memory. Over time, this grows unbounded.

---

### M-14: Billing API Session Date Starts March 1st, Attendance Starts April 1st

**Files:**
- [billing/route.ts:299](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/app/api/billing/route.ts#L299): `March 01`
- [attendance/route.ts:30](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/app/api/attendance/route.ts#L30): `April 01`

Inconsistent academic year start dates between billing (March 1st) and attendance (April 1st). This means March charges exist in billing but March attendance doesn't load.

---

### M-15: `memory.md` Says "No Gender Field" But Schema Has One

**File:** [memory.md:27](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/memory.md#L27)
> "The Student database model does NOT contain a gender field."

But [schema.prisma:146](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/prisma/schema.prisma#L146):
```prisma
gender          String?
```

The documentation is wrong / outdated. `gender` field was added later but `memory.md` wasn't updated.

---

## 🔵 LOW SEVERITY ISSUES

---

### L-01: Duplicate JWT Libraries

`jose` (v6.2.3) and `jsonwebtoken` (v9.0.3) are both installed. Only `jsonwebtoken` is used. Remove `jose` to reduce bundle size.

---

### L-02: `AccountantDashboard` Doesn't Handle `students/idcards/audit` Tabs

**File:** [AccountantDashboard.tsx:43-56](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/AccountantDashboard.tsx#L43-L56)

`validTabs` includes `"students"`, `"idcards"`, `"audit"` but there's no JSX rendering for these tabs in the component. Clicking them shows a blank white area.

---

### L-03: Excessive Diagnostic Logging in Production

All API routes have verbose `console.log` statements with `[DIAGNOSTIC]` prefix. These should be behind a `NODE_ENV === "development"` check for production.

---

### L-04: `status` Field on Student Not Indexed

**File:** [schema.prisma:176](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/prisma/schema.prisma#L176)

`Student.status` is frequently filtered (`"ACTIVE"` vs `"LEFT"`) but has no database index. As student count grows, these queries slow down.

---

### L-05: No Index on `FeeHead.name`

`FeeHead.name` has a `@unique` constraint (which creates an index), but `Concession.feeHeadName` references it by **name string** rather than by foreign key — a denormalized design that can get out of sync.

---

### L-06: `useEffect` Missing Dependencies in AdminDashboard

**File:** [AdminDashboard.tsx:265-269](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/AdminDashboard.tsx#L265-L269)

```typescript
React.useEffect(() => {
  if (!VALID_ADMIN_TABS.includes(activeTab as any)) {
    setActiveTab("dashboard");
  }
}, [activeTab]); // ← Missing setActiveTab
```

---

### L-07: Parent Dashboard Shows "Tap to pay online" But No Online Payment

**File:** [ParentDashboard.tsx:211](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/components/ParentDashboard.tsx#L211)

```typescript
<p className="text-[10px] ...">Tap to pay online</p>
```

The text says "Tap to pay online" but clicking navigates to the fees tab. If online payment isn't configured (no UPI ID), this is misleading.

---

### L-08: Hardcoded Year `2026` in CalendarEvent Schema

**File:** [schema.prisma:463](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/prisma/schema.prisma#L463)

```prisma
year        Int      @default(2026)
```

Hardcoded default year. Will be wrong starting January 2027.

---

### L-09: `useEffect` Closure Warning — `validTabs` Not Stable

**Files:** TeacherDashboard, ParentDashboard, AccountantDashboard

`validTabs` is declared as a `const` inside the component body (recreated every render). It should be extracted to module level (like `VALID_ADMIN_TABS` in AdminDashboard) to avoid unnecessary effect re-runs.

---

### L-10: CSS `@apply` Potential Conflict with Tailwind v4

**File:** [globals.css](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/src/app/globals.css)

The project uses Tailwind v4 (`"^4"`). Some CSS patterns using `@apply` and custom utilities may behave differently in v4 compared to v3. Verify all custom utility classes work as expected.

---

## Per-Role Summary

### 👨‍💼 Admin
- Dashboard is 653KB monolith (H-02)
- Notes lost on browser change (M-03)
- Google credentials in localStorage (M-04)
- Missing tab handling for some states
- Audit logs not paginated (M-12)

### 👩‍🏫 Teacher
- UTC timezone bug in attendance dates (H-01)
- Can see all classes, not just assigned (M-05)
- No code-splitting on heavy imports (M-02)
- Homework not paginated (M-13)
- Missing useEffect deps (H-10)

### 👨‍👩‍👧 Parent
- Fake UPI QR code if not configured (C-05)
- Attendance rate includes Leave/Late as present (M-01)
- UTC date bug (H-01)
- Misleading "Tap to pay online" text (L-07)

### 💼 Accountant
- Receipt filter by name is fragile (H-04)
- Concession substring match gives wrong discounts (C-08)
- WhatsApp fails for 11-digit phones (H-03)
- Blank tabs for students/idcards/audit (L-02)
- Quick filters hardcoded to English month names (H-06)

### 🔒 Security & Auth
- Production secrets in `.env` git (C-01)
- JWT secret only 28 chars (C-01)
- Auth/me skips token version check (C-06)
- No CSRF protection (H-11)
- Middleware dot-bypass (M-10)

### 🗄️ Database & API
- Unbounded cache DoS (C-02)
- Student status not enum (C-07)
- Inconsistent session start dates (M-14)
- Raw string fields instead of enums for several models
- No paymentMethod enum validation in billing POST (M-07)

### 📱 PWA & UI
- Service worker may cache API data (H-05)
- BottomSheet swipe broken (H-08)
- Mobile card layout shift (M-08)
- Manifest icon purpose issues (M-09)
