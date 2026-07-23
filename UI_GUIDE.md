# School Finance OS - UI & UX Architecture Guide (UI_GUIDE.md)

> **IMPORTANT FOR AI AGENTS**: Read this file before making any changes to UI components, tab routes, navigation bars, styling, or state logic in `src/app` or `src/components`. This ensures UI consistency and prevents layout breakages.

---

## 1. Executive Summary & Design Aesthetics

- **Design Style**: Premium Glassmorphism with Dark Theme (`bg-slate-950`, `bg-slate-900`, `border-slate-800/60`, `backdrop-blur-xl`).
- **Typography**: Clean modern sans-serif hierarchy (Inter / System Fonts).
- **Responsiveness**: Mobile-First design with bottom navigation drawer on mobile (`< md`) and full top-bar / sidebar on desktop (`>= md`).
- **Role Theme Colors**:
  - 🟣 **ADMIN**: `bg-indigo-600` / `text-indigo-400` / `border-indigo-500`
  - 🟢 **ACCOUNTANT**: `bg-emerald-600` / `text-emerald-400` / `border-emerald-500`
  - 🟡 **TEACHER**: `bg-amber-500` / `text-amber-400` / `border-amber-500`
  - 🔴 **PARENT**: `bg-rose-500` / `text-rose-400` / `border-rose-500`

---

## 2. Layout Structure (`src/components/AppLayout.tsx`)

`AppLayout.tsx` wraps all authenticated pages in the application.

### Top Navigation Bar (Desktop & Mobile)
1. **Brand & Role Badge**: School logo, title ("School ERP / OS"), active role badge.
2. **Role Switcher**: Dropdown/modal allowing users with multi-role permissions to toggle between `ADMIN`, `ACCOUNTANT`, `TEACHER`, and `PARENT`.
3. **Global Search**: Search bar matching student names, admission numbers, or parent contacts.
4. **App Suite Launcher**: Grid icon opening `AppsIntegrationModal.tsx` (Apps: Finance, Academics, LMS, Attendance, HR/Payroll, Bus Transport, Library, Hostel, Communication).
5. **Notice Bell & Drawer**: Notification dropdown showing system broadcasts.

### Mobile Navigation (Bottom Bar)
- Displays **4 main tab icons** based on active role + **1 "More" button**.
- Clicking "More" opens a slide-up sheet displaying remaining role tabs, profile options, and logout.

---

## 3. Role-Based Navigation & Tab Routes

### 🅰️ ADMIN Role (`activeRole === "ADMIN"`)
| Tab Key | Display Name | Component/Section Handled | Description |
| :--- | :--- | :--- | :--- |
| `dashboard` | Admin Dashboard | `AdminDashboard.tsx` | High-level analytics, fee collection overview, quick actions, total students/teachers stats. |
| `collect` | Collect Fees | `AdminDashboard.tsx` -> Collect Section | Search student, record online/cash payment, generate PDF receipt. |
| `marks` | Feed Student Marks | `MarksFeedingConsole.tsx` | Enter subject-wise exam marks for classes and sections. |
| `defaulters` | Dues Report | `AdminDashboard.tsx` -> Dues Tab | Filter students with unpaid balance, send SMS/WhatsApp alerts. |
| `ledger` | Receipts Ledger | `AdminDashboard.tsx` -> Ledger Tab | Transaction history log with receipt search and filter. |
| `structures` | Configure Fees | `AdminDashboard.tsx` -> Fee Structure | Define monthly tuition, transport, computer fees per class. |
| `students` | Register Student | `AdminDashboard.tsx` -> Add Student | Add new student profile, assign family code & class. |
| `users` | User Status Control | `AdminDashboard.tsx` -> User Management | Enable/disable user logins, reset passwords, change roles. |
| `idcards` | ID Cards & Photos | `AdminDashboard.tsx` -> ID Card Tool | Generate printable student ID cards with QR codes & photo upload. |
| `notices` | Create Notices | `AdminDashboard.tsx` -> Notice Board | Publish school-wide or class-specific notifications. |
| `school` | System Config | `AdminDashboard.tsx` -> Settings | Edit school metadata, academic session year (e.g. 2026-27). |
| `audit` | System Audit Logs | `AdminDashboard.tsx` -> Audit Log | Detailed user action history logs for security. |

---

### 🅱️ ACCOUNTANT Role (`activeRole === "ACCOUNTANT"`)
| Tab Key | Display Name | Component/Section Handled | Description |
| :--- | :--- | :--- | :--- |
| `collect` | Collect Offline Fee | `AccountantDashboard.tsx` | Main POS collection interface for accepting cash/UPI/cheque fees. |
| `defaulters` | Dues Report | `AccountantDashboard.tsx` | Dues breakdown by class, installment month, and pending amount. |
| `marks` | Feed Student Marks | `MarksFeedingConsole.tsx` | Marks entry console shared with teachers. |
| `structures` | Configure Fee | `AccountantDashboard.tsx` | Adjust class fee components and discount policies. |
| `ledger` | System Ledger | `AccountantDashboard.tsx` | Daily audit trail of payments collected & receipts printed. |

---

### Ⓒ TEACHER Role (`activeRole === "TEACHER"`)
| Tab Key | Display Name | Component/Section Handled | Description |
| :--- | :--- | :--- | :--- |
| `attendance` | Mark Attendance | `TeacherDashboard.tsx` | Daily roll-call checklist (Present / Absent / Late) for assigned class. |
| `marks` | Feed Student Marks | `MarksFeedingConsole.tsx` | Enter marks for Unit Tests, Half Yearly, and Annual Exams. |
| `homework` | Upload Homework | `TeacherDashboard.tsx` | Assign daily subject homework with file attachments & due dates. |
| `leaves` | Leave Requests | `TeacherDashboard.tsx` | Review and approve/reject student leave applications. |

---

### Ⓓ PARENT Role (`activeRole === "PARENT"`)
| Tab Key | Display Name | Component/Section Handled | Description |
| :--- | :--- | :--- | :--- |
| `dashboard` | Child's Overview | `ParentDashboard.tsx` | Overview card of selected child (Fee summary, attendance %, latest marks). |
| `reportcard` | Academic Report Card| `ParentDashboard.tsx` | Detailed grade sheet with term marks breakdown and teacher remarks. |
| `fees` | Pay School Fees | `ParentDashboard.tsx` | Payment gateway interface with online pay & downloadable PDF receipts. |
| `homework` | Homework Assignments| `ParentDashboard.tsx` | View daily homework assignments for the child. |
| `attendance` | Attendance History | `ParentDashboard.tsx` | Calendar view showing present/absent days for the academic session. |
| `leave` | Apply for Leave | `ParentDashboard.tsx` | Submit leave request with date range and reason to class teacher. |

---

## 4. Key UI Modals & Shared Overlay Components

### 1. `StudentProfileModal.tsx`
- **Trigger**: Click "View Details" on any student card across Admin, Accountant, or Teacher views.
- **Style**: Slide-out glassmorphic modal with 4 interactive tabs:
  - 👤 **Profile Info**: Admission details, roll number, father/mother name, mobile, family code.
  - 💳 **Fees & Ledger**: Complete ledger charges, payments made, receipt numbers, and pending balance.
  - 📊 **Attendance**: Radial progress widget + monthly attendance breakdown.
  - 📝 **Leave Requests**: Applied leaves history and status badge (Approved/Pending/Rejected).

### 2. `MarksFeedingConsole.tsx`
- **Trigger**: Selected via `marks` tab in Admin, Accountant, or Teacher roles.
- **Controls**:
  - Class Selector (`KG` to `12th`)
  - Section Selector (`A`, `B`, `C`)
  - Term Selector (`Unit Test 1`, `Half Yearly`, `Annual`)
  - Subject Selector (`Maths`, `Science`, `English`, etc.)
- **Matrix Grid**: Table with roll number, student name, max marks, obtained marks input, and instant autosave status.

### 3. `AppsIntegrationModal.tsx`
- **Trigger**: Grid icon in header.
- **Grid Layout**: 9 school ERP module launchers with active status indicators and quick switch capability.

---

## 5. UI Rules & Safeguards for Future Edits

When modifying or adding features, ALWAYS follow these guidelines:

1. ❌ **Do NOT rename existing `activeTab` strings** (e.g. keep `"collect"`, `"defaulters"`, `"marks"`, `"ledger"`, `"structures"`, `"students"`). Renaming these will break routing and active state highlights in `AppLayout.tsx`.
2. ❌ **Do NOT mutate global arrays directly**. Keep transient modal/filter states inside local component `useState` or context actions.
3. 🎨 **Maintain Glassmorphism Design Tokens**:
   - Containers: `bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl rounded-2xl`
   - Inputs: `bg-slate-950/60 border border-slate-700/60 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500`
   - Primary Buttons: `bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all`
4. 📱 **Test Mobile & Desktop Compatibility**: Ensure any new tab or action added to `AppLayout.tsx` is included in both the desktop navbar/sidebar AND the mobile bottom navigation / "More" drawer.
5. 🛡️ **Preserve Data Formatting**: Fees are always displayed as Rupees (`₹(amount / 100).toFixed(2)`), even though stored as Paisa (Integer) in the database.
