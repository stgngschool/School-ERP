# School Finance OS - System Memory & Project Blueprint

This file serves as the definitive long-term context memory for AI agents working on **School Finance OS**. It captures core system architecture, business rules, security mandates, mobile UI paradigms, and historical context.

---

## 1. Project Overview & Credentials

* **Project Name**: School Finance OS
* **Stack**: Next.js 15+ (App Router), Prisma ORM, PostgreSQL (Supabase), Tailwind CSS, TypeScript.
* **Default Seed Credentials**:
  * **Admin**: `admin` / `admin123`
  * **Accountant**: `accountant` / `accountant123`
  * **Teacher**: `teacher` / `teacher123`
  * **Parents**: `parent_<fatherMobile>` / `parent123`

---

## 2. Immutable Architecture & Business Rules

### A. Accountant Role Policy (Strict User Directive)
* **NO RESTRICTIVE LOCKS / PINS FOR ACCOUNTANT**:
  * Do **NOT** add authorization PINs, 4-digit code gates, OTPs, or approval workflows for the Accountant role in fee collection, ledger entry, receipt printing, or student directory.
  * Explicit user constraint: *"School chota hai, hume sab dikhta hai, accountant ke liye abhi koi rok-vok mat lagao."*
  * Both Admin and Accountant have direct operational access to collect fees and print receipts without friction.

### B. Money & Precision (Integer Paisa)
* **Format**: All monetary amounts are computed and stored as **Integers in Paisa** (`₹1.00 = 100 Paisa`).
* **Conversion**: Always use helper functions like `toPaisa(rupees)` and `fromPaisa(paisa)` to completely eliminate JavaScript floating-point arithmetic errors.
* **Tuition Fees Structure**:
  * Nursery, LKG, UKG: ₹600.00 / month (`60,000` Paisa).
  * Classes 1st to 8th: ₹700.00 / month (`70,000` Paisa).
  * Academic Months (12): `April, May, June, July, August, September, October, November, December, January, February, March`.
* **Exemptions**: RTE (Right to Education) students are completely exempted from monthly tuition fees.

### C. Timezone & Date Discipline (Strict IST)
* **Rule**: Indian Standard Time (`UTC+05:30`) MUST be used for all date boundaries, attendance marks, collection records, and academic cutoffs.
* **Implementation**: Always use project helpers such as `getTodayIST()` instead of `new Date().toISOString().split('T')[0]` which causes previous-day rollover bugs in IST evening hours.

### D. Zero Hardcoded UPI Fallback
* **Rule**: NEVER hardcode fallback personal UPI IDs (e.g., `8423926608@upi` was removed permanently).
* **Behavior**:
  * If `school.upiId` is blank in `school.json` or database settings, digital QR generation and UPI collection must show an amber warning: *"School UPI not configured. Please add school UPI in settings..."*.
  * Submit button is safely disabled with label: *"UPI Not Configured — Choose Another Method"*.

### E. Single Source of Truth for Fee Collection
* `src/components/shared/FeeCollectTab.tsx` is the canonical, deduplicated fee collection engine.
* `src/components/admin/FeeCollectTab.tsx` is a lightweight re-export proxy to prevent codebase duplication and drift.

---

## 3. Mobile UI/UX Design System Guidelines

### A. Floating Card Architecture
* **Mobile Aesthetic (`< 768px`)**:
  * Cards must use `border-0 sm:border rounded-2xl shadow-sm bg-white` floating over `bg-slate-50`.
  * **NEVER** apply global edge-to-edge square overrides (such as `border-radius: 0 !important` or `box-shadow: none !important`).
* **Visual Hierarchy**: Smooth 16px corner radius, subtle borders on desktop, clean elevated cards on mobile.

### B. Full-Bleed Action Strips ("Screen Ke Bahar Se")
* Horizontal scrolling filter bars, quick action hubs, and category pills on mobile must stretch edge-to-edge using negative margins:
  * Classes: `-mx-3 px-3 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar flex items-center gap-2`
  * Add a trailing spacer `<div className="w-2 shrink-0 sm:hidden" />` at the end so the final chip does not clip against the right screen border.
  * This creates the seamless native app impression that options emerge from beyond the physical viewport.

### C. Bottom Navigation & Floating Bar Clearance
* On mobile, the app has a persistent bottom navigation bar (`var(--bottom-nav-height, 64px)`).
* Any sticky floating action bar (e.g., Save Attendance, Save Marks) must be positioned with:
  * `bottom-[calc(var(--bottom-nav-height,64px))]` (or `bottom-16`).
* The scrollable content container above it must have generous padding (e.g. `pb-32` or `pb-36`) so content is never obscured behind the floating bar.

### D. Mobile-Friendly Table Adaptation
* Use the project utility `.mobile-table-to-cards` with `data-label` attributes on table cells to transform wide desktop data grids into stacked mobile cards on smaller viewports.

### E. Touch Gesture & BottomSheet
* `BottomSheet.tsx` uses native non-passive `touchmove` listeners with `preventDefault()` to prevent background scrolling and rubber-banding during sheet drag/dismiss.

---

## 4. Documentation & Security Reference Map

Comprehensive project specifications are maintained in the following dedicated files:

### System & Architecture Documentation (`docs/`)
1. [`docs/PRD.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/docs/PRD.md): Product Requirements, user personas, operational workflows, and functional specs.
2. [`docs/TRD.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/docs/TRD.md): Technical Requirements, caching strategies (`BoundedCache(50)`), Prisma schema, and API contracts.
3. [`docs/AppFlow.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/docs/AppFlow.md): End-to-end user navigation flows and role permission matrices.
4. [`docs/Backend-Schema.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/docs/Backend-Schema.md): Database ERD, models, relations, indexes, and Paisa representations.
5. [`docs/UIUX-Design-Brief.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/docs/UIUX-Design-Brief.md): Mobile design principles, typography, touch targets, and Indian English language rules.
6. [`docs/Implementation-Plan.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/docs/Implementation-Plan.md): Phased development roadmap, testing checkpoints, and release gates.
7. [`UI_GUIDE.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/UI_GUIDE.md): Layout hierarchies, tab routes, and component guides.

### Security & Governance Documentation (`security/`)
1. [`security/threat-model.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/security/threat-model.md): STRIDE threat assessment, actor profiles, and risk matrix.
2. [`security/attack-surface.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/security/attack-surface.md): Exposed endpoints, auth vectors, and mitigation rules.
3. [`security/data-handling.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/security/data-handling.md): PII handling, student data privacy, encryption at rest/transit.
4. [`security/safe-delete-policy.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/security/safe-delete-policy.md): Soft delete policies, audit logging, and financial record immutability.
5. [`security/secrets.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/security/secrets.md): Secret management, environment variables, and credential hygiene.
6. [`security/security-checklist.md`](file:///d:/All%20Project%20of%20AntiGravity/School%20Finance%20OS/security/security-checklist.md): Pre-production verification checklist.

---

## 5. Key Historical Fixes & Retained Context

1. **Logo Asset Optimization**:
   * Original `public/logo.png` (~1.03 MB) was quantized to ~50 KB (512px).
   * High-performance `public/logo.webp` (~49 KB) created for ultra-fast mobile cold starts.
2. **Session Invalidation**:
   * `tokenVersion` counter added to `User` model to instantly revoke active JWTs upon password change or administrative revocation.
3. **Admin Dashboard Mobile Polishing**:
   * Symmetrical 2x2 metric KPI grid (`Revenue`, `Active Students`, `Pending Dues`, `Today Attendance`).
   * Clean edge-to-edge floating Quick Command Strip (`-mx-3 px-3`).
   * Responsive bar chart and doughnut chart container with zero overflow.
4. **Marks Feeding Mobile Polishing**:
   * Horizontal swipe action bar for quick exam controls.
   * Lock exam indicator fixed to clean icon `🔒` instead of truncated text.
   * Floating save bar elevated with `bottom-[calc(var(--bottom-nav-height,64px))]` and `pb-32` spacing.
