# Application Flow & Navigation Architecture
## Project: School Finance OS

---

## 1. Authentication & Session Flow

```mermaid
sequenceDiagram
    actor Staff as Staff / Admin
    participant Client as Frontend (AppLayout)
    participant AuthAPI as /api/auth/me
    participant Session as JWT & tokenVersion

    Staff->>Client: Open School Finance OS
    Client->>AuthAPI: GET /api/auth/me (JWT Cookie)
    AuthAPI->>Session: Validate tokenVersion against database
    alt Valid Token & Version Matches
        Session-->>AuthAPI: OK (User Info, Role)
        AuthAPI-->>Client: 200 OK (Authenticated)
        Client->>Client: Render Dashboard View
    else Invalid or Revoked tokenVersion
        Session-->>AuthAPI: Stale / Revoked Session
        AuthAPI-->>Client: 401 Unauthorized
        Client->>Client: Redirect to /login
    end
```

---

## 2. Navigation Hierarchy & Role Access

### 2.1 Role-Based Tab Mapping
- **ADMIN Role**:
  - `overview`: High-level financial KPIs, revenue charts, today's collections, birthdays, scratchpad.
  - `collect`: Fee Counter & Cashier Desk (Shared unified engine).
  - `students`: Student Directory, sibling linkage, profile management.
  - `defaulters`: Defaulters Tracking, aging analysis, WhatsApp alerts.
  - `ledger`: General Voucher Register, Daybook tallying.
  - `attendance`: Daily Roll Call and Monthly Register.
  - `marks`: Student Marks Entry and Evaluation Console.
  - `print_marksheets`: Comprehensive academic report card printer.
  - `structures`: Fee Structure Setup & Class mappings.
  - `users`: User Security, Staff accounts, credential management.
  - `settings`: School Profile, UPI VPA configuration, academic session setup.
- **ACCOUNTANT Role**:
  - Full operational access to cashiering, directory, attendance, marks, and defaulters without artificial bottlenecks.

---

## 3. End-to-End Fee Collection Flow

```mermaid
flowchart TD
    Start([Open Fee Counter]) --> Lookup[Search Student by Roll / Name / Admission No]
    Lookup --> SelectStudent[Select Student from Quick List]
    SelectStudent --> FetchDues[System Fetches Unpaid Due Heads & Balances]
    FetchDues --> SelectHeads[Cashier Selects Heads to Pay]
    SelectHeads --> AdjustAmount[Apply Concession / Adjust Installment Amount]
    AdjustAmount --> SelectMethod{Select Payment Mode}
    SelectMethod -->|CASH| CashTally[Enter Tendered Amount & Calculate Change]
    SelectMethod -->|UPI| UpiCheck{Is School UPI Configured?}
    UpiCheck -->|Yes| UpiQR[Display Dynamic UPI QR Code]
    UpiCheck -->|No| UpiBlock[Alert Cashier: UPI VPA Not Configured]
    SelectMethod -->|BANK / CHEQUE| BankRef[Enter Cheque / UTR Reference]
    CashTally --> SubmitPay[Submit Transaction]
    UpiQR --> SubmitPay
    BankRef --> SubmitPay
    SubmitPay --> AtomicSave[Atomic Ledger Entry & Receipt Generation]
    AtomicSave --> PrintModal[Open Receipt Modal with Print & WhatsApp Share Options]
```

---

## 4. Defaulters Recovery & WhatsApp Flow

```mermaid
flowchart LR
    DefaultersTab[Defaulters Tab] --> FilterClass[Filter by Class & Due Threshold]
    FilterClass --> ActionSelect{Action}
    ActionSelect -->|Direct WhatsApp| OpenWA[Generate Pre-filled WhatsApp URI -> Launch Chat]
    ActionSelect -->|Drilldown Statement| ViewLedger[View Full Student Ledger History]
    ActionSelect -->|Immediate Collect| OpenDrawer[Launch Counter Drawer with Preselected Dues]
```

---

## 5. Marks Feeding & Exam Locking Flow

```mermaid
flowchart TD
    MarksTab[Marks Feeding Console] --> PickExam[Select Class, Exam & Subject]
    PickExam --> CheckLock{Is Exam Locked in School Settings?}
    CheckLock -->|Yes| ReadOnlyMode[Display Gold Lock Banner, Inputs Disabled]
    CheckLock -->|No| InteractiveMode[Enable Rapid Marks Input Grid]
    InteractiveMode --> LocalDraft[Auto-save Draft to LocalStorage]
    InteractiveMode --> SaveSingle[Save Single Student (Instant Cloud Sync)]
    InteractiveMode --> SaveAll[Save All Marks (Batch Atomic Sync)]
    SaveAll --> ConfModal[Display Reassuring Success Modal]
```
