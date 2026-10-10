# Product Requirements Document (PRD)
## Project: School Finance OS

---

## 1. Executive Summary & Vision
**School Finance OS** is a specialized, lightning-fast, offline-resilient School Operating System and Financial Engine designed for Indian private schools (K-12, CBSE, ICSE, and State Boards).

Traditional school ERPs are bloated, slow, require constant high-speed internet, and fail on budget Android smartphones used by accountants and school administrators. **School Finance OS** focuses on the core revenue and operational lifeline of a school:
1. **Fee Collection & Cashier Desk** (Instant receipt generation, partial payments, UPI QR & cash tallying).
2. **Defaulters Tracking & Recovery Engine** (Automated WhatsApp fee reminders, drilldown ledgers).
3. **Student & Family Directory** (Sibling mapping, concessions, quick admissions).
4. **Academics & Examination Desk** (Marks feeding, exam locking, student marksheets).
5. **Mobile-First Floating UX** (Edge-to-edge floating cards, instant tactile actions, responsive tables).

---

## 2. Core User Personas

### 2.1 School Administrator / Owner (Admin)
- **Role**: Overall control of school operations, fee configurations, user management, audit logs, and strategic financial summaries.
- **Key Goals**:
  - Live revenue monitoring (collected vs pending full-year budget targets).
  - Staff accountability (tracking which accountant collected how much cash vs UPI).
  - One-click circular broadcasts and exam finalization (locking marks).
  - System-wide security, data backups, and school profile settings.

### 2.2 School Accountant / Cashier
- **Role**: Front-desk operations, daily fee collection, printing thermal/A4 vouchers, and handling parent inquiries.
- **Key Goals**:
  - Search any student in < 200ms by Roll No, Name, or Admission Number.
  - Collect fees across multiple heads with automatic calculation.
  - Apply waivers, discounts, or installment plans smoothly.
  - Daily cash reconciliation (closing the cash drawer with zero discrepancy).
  - *Policy Note*: Operates with full trust without obstructive administrative PIN locks for daily cashier throughput.

### 2.3 Teacher / Academic Evaluator
- **Role**: Entering term marks, managing student attendance, and conducting roll call.
- **Key Goals**:
  - Rapid marks entry per subject with split breakdown (Theory + Practical/Viva).
  - Instant offline drafting so unsaved marks are never lost on network drop.
  - Verification against exam maximum marks and locked exam safeguards.

---

## 3. Key Feature Modules

### 3.1 Fee Counter & Billing Engine
- **Multi-Head Fee Billing**: Tuition, Transport, Examination, Admission, Annual, Computer, and Miscellaneous charges.
- **Payment Methods**:
  - **Cash**: Instant tallying for physical counter drawers.
  - **UPI Smart Pay**: Dynamic/Static VPA generation with zero hardcoded fallbacks; safeguards prevent collection if school UPI is unconfigured.
  - **Bank Transfer / RTGS / Cheque**: Reference tracking and instrument clearing logs.
- **Voucher & Receipt Generator**:
  - Automatic sequential receipt numbering (`REC-YYYYMM-XXXX`).
  - Printable receipt modal with school branding, student profile, fee breakdown, and payment mode badge.
  - Sibling consolidated billing support.
- **Paisa Precision Math**: All calculations strictly processed in integer Paise (`₹1 = 100 paise`) to prevent IEEE 754 floating-point balance drift.

### 3.2 Defaulters Tracking & WhatsApp Automation
- **Aging & Outstanding Analysis**:
  - Segregation between *Current Overdue* (due up to current academic month) vs *Future Academic Year Target*.
- **1-Click WhatsApp Reminders**:
  - Pre-filled compliant WhatsApp message links sent directly to parents' mobile numbers.
  - Personalized with student name, class, outstanding amount, and breakdown.
- **Direct Drilldown Ledger**:
  - Single-click transition from Defaulters list into comprehensive Student Statement drilldown and Fee Counter.

### 3.3 Student Directory & Admissions Leads Desk
- **Student Profile Management**: Full student registry with Class, Section, Roll No, Admission No, Parent Contacts, and Transport route.
- **Family / Sibling Linking**: Grouping siblings under a single parent contact for combined ledger view.
- **Admission Leads Pipeline**: Tracking walk-ins, phone inquiries, status pipeline (New -> Contacted -> Form Issued -> Enrolled).

### 3.4 Examination & Marks Feeding Console
- **Flexible Assessment Modes**: Single composite marks or multi-component split marks (Theory, Viva, Practical, Notebook).
- **Exam Lock Mechanism**: Administrators can lock completed exams (`lockedExams`) preventing accidental or unauthorized grade alterations.
- **Live Performance Stats**: Class average, pass percentage (≥33%), top scorer, and completion counter.
- **Export & Reporting**: CSV exports (Class-wise / School-wide) and Excel sheets.

### 3.5 Daily Attendance Console
- **Class Roll Call**: One-tap Present, Absent, Late, or Leave status.
- **Monthly Attendance Register**: Grid view of student attendance trends.

---

## 4. Non-Functional Requirements (NFRs)

| Metric | Target Requirement |
| :--- | :--- |
| **Search Latency** | < 150ms client-side filter across 1,500+ student records |
| **Offline Resilience** | Form drafts auto-saved in browser `localStorage` across page refreshes |
| **Financial Accuracy** | Zero floating-point rounding errors (`toPaisa` integer math) |
| **Mobile Responsiveness** | Fully functional on 360px width Android screens (floating edge-to-edge UX) |
| **Timezone Consistency** | Indian Standard Time (`IST`, UTC+5:30) for all receipts and logs |
| **Bundle Size** | Lightweight client bundle, WebP optimized assets (< 60KB logo) |

---

## 5. Success Metrics (KPIs)
1. **Zero Cash Discrepancy**: End-of-day counter receipts match accountant cash drawer tally 100%.
2. **Recovery Rate Acceleration**: Reduction of 30-day fee default cycle by at least 40% via WhatsApp reminder triggers.
3. **Counter Speed**: Average fee collection transaction completed in under 45 seconds from student lookup to printed receipt.
