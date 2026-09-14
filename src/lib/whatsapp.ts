import { formatP } from "./currency";

export interface FeeReminderParams {
  student: {
    id: string;
    name: string;
    class: string;
    section: string;
    rollNo?: string;
    admissionNo?: string;
    fatherName?: string;
    fatherMobile?: string;
    motherMobile?: string;
    parentPhone?: string;
  };
  unpaidDues: Array<{
    id: string;
    name?: string;
    title?: string;
    amount: number;
    dueDate?: string;
    month?: string;
  }>;
  schoolInfo: {
    name?: string;
    phone?: string;
    upiId?: string;
  };
  senderRole?: "TEACHER" | "ACCOUNTANT" | "ADMIN";
}

// Academic Year Months: April (index 0) to March (index 11)
const ACADEMIC_MONTHS = [
  "april", "may", "june", "july", "august", "september",
  "october", "november", "december", "january", "february", "march"
];

/**
 * Determines whether a given fee charge/due is due up to the reference month/date (defaults to current date).
 * - Authoritative signal: If item.dueDate is present, it is checked directly against referenceDate.
 * - Academic-month items without dueDate: Checked against referenceDate's academic month index (April = 0 ... March = 11).
 * - Future annual/exam items with future due dates do not prematurely become overdue.
 */
export function isDueUpToCurrentMonth(
  item: { name?: string; title?: string; dueDate?: string },
  referenceDate = new Date()
): boolean {
  // ── BL-04: 1. Authoritative signal: Use item's actual dueDate whenever available
  if (item.dueDate) {
    const dueTime = new Date(item.dueDate).getTime();
    if (!isNaN(dueTime)) {
      // Due date is satisfied once the reference date reaches or passes the due date
      const endOfDueDay = new Date(item.dueDate);
      endOfDueDay.setHours(23, 59, 59, 999);
      return referenceDate.getTime() >= new Date(item.dueDate).setHours(0, 0, 0, 0);
    }
  }

  const itemName = (item.name || item.title || "").toLowerCase();

  // ── BL-04: 2. Academic-month fee items without explicit dueDate: evaluate against reference month
  const calMonth = referenceDate.getMonth(); // 0 = Jan, 3 = Apr, 7 = Aug
  const currentAcademicIndex = (calMonth + 9) % 12; // Apr=0, May=1, ..., Aug=4, ..., Mar=11

  for (let i = 0; i < ACADEMIC_MONTHS.length; i++) {
    const mName = ACADEMIC_MONTHS[i];
    if (itemName.includes(mName)) {
      return i <= currentAcademicIndex;
    }
  }

  // ── BL-04: 3. Session-start fees without explicit dueDate (Admission, Arrears, M/S, Previous Session)
  if (
    itemName.includes("admission") ||
    itemName.includes("arrear") ||
    itemName.includes("previous session") ||
    itemName.includes("m/s") ||
    itemName.includes("annual")
  ) {
    return currentAcademicIndex >= 0;
  }

  // Default: Unknown non-monthly items without dueDate do not default to overdue
  return false;
}

export function getCurrentMonthName(date = new Date()): string {
  return date.toLocaleString("en-US", { month: "long" });
}

export function cleanPhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  // Exactly 10 digits: add country code 91
  if (digits.length === 10) return `91${digits}`;
  // 11 digits starting with 0 (e.g. 09876543210): strip leading 0 and add 91
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  // 12 digits starting with 91 (e.g. 919876543210): already properly formatted
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  // Extra leading zeros or international prefix with 10-digit Indian number
  if (digits.length > 10) {
    const last10 = digits.slice(-10);
    if (/^[6-9]\d{9}$/.test(last10)) {
      return `91${last10}`;
    }
  }
  return digits;
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function generateFeeReminderText(params: FeeReminderParams): string {
  const { student, unpaidDues, schoolInfo, senderRole } = params;
  const schoolName = schoolInfo?.name || "School";
  const greeting = getTimeGreeting();
  const currentMonthName = getCurrentMonthName();

  // Filter dues up to the current month only
  const activeUnpaidDues = unpaidDues.filter((d) => isDueUpToCurrentMonth(d));
  const totalDue = activeUnpaidDues.reduce((sum, item) => sum + item.amount, 0);

  // ── WA-02: Show all active dues (no silent truncation at 5 items)
  const itemsBreakdown = activeUnpaidDues
    .map((item) => `• ${item.name || item.title || "School Fee"}: ${formatP(item.amount)}`)
    .join("\n");

  const roleDesignation =
    senderRole === "TEACHER"
      ? "Class Teacher & Accounts Desk"
      : senderRole === "ACCOUNTANT"
      ? "Accounts & Fee Counter"
      : "School Administration";

  return `*Fee Due Reminder — ${schoolName}*

${greeting} Sir/Madam,
Respected Parent of *${student.name}* (Class ${student.class}-${student.section}${student.rollNo ? `, Roll No: ${student.rollNo}` : ""}${student.admissionNo ? `, ADM: ${student.admissionNo}` : ""}),

This is a gentle notification from the ${roleDesignation} regarding pending school fee dues:

📌 *Total Outstanding Due (Up to ${currentMonthName}):* ${formatP(totalDue)}
${itemsBreakdown || "• Pending Tuition / Academic Fee"}

Kindly deposit the pending fees at the school fee collection counter or online via UPI at your earliest convenience.

${schoolInfo?.upiId ? `💳 *School UPI ID:* \`${schoolInfo.upiId}\`\n` : ""}${schoolInfo?.phone ? `🏫 *School Office / Helpdesk:* ${schoolInfo.phone}\n` : ""}
Thank you for your continued cooperation!
— *${schoolName}*`.trim();
}

export function generateFeeReminderWhatsAppUrl(params: FeeReminderParams): string {
  const { student } = params;
  const targetPhone = student.fatherMobile || student.motherMobile || student.parentPhone || "";
  const cleaned = cleanPhoneNumber(targetPhone);
  const text = generateFeeReminderText(params);
  
  if (!cleaned) {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

export interface BirthdayWishParams {
  student: {
    id: string;
    name: string;
    class: string;
    section: string;
    rollNo?: string;
    admissionNo?: string;
    fatherName?: string;
    fatherMobile?: string;
    motherMobile?: string;
    parentPhone?: string;
  };
  schoolInfo: {
    name?: string;
    phone?: string;
  };
}

export function generateBirthdayWishText(params: BirthdayWishParams): string {
  const { student, schoolInfo } = params;
  const schoolName = schoolInfo?.name || "St. GNG School";
  const className = student.class ? `Class ${student.class}${student.section ? `-${student.section}` : ""}` : "School";
  
  return `🎂 *Happy Birthday ${student.name}!* 🎉

Dear Parent,
Heartiest congratulations and warmest wishes from the entire *${schoolName}* Family on the birthday of your beloved child, *${student.name}* (${className})! 💐✨

May Almighty bless them with radiant health, sharp wisdom, joyful laughter, and shining success in every step of life. 🌟

With warm regards & blessings,
*Principal & Management*
— *${schoolName}*`.trim();
}

export function generateBirthdayWishWhatsAppUrl(params: BirthdayWishParams): string {
  const { student } = params;
  const targetPhone = student.fatherMobile || student.motherMobile || student.parentPhone || "";
  const cleaned = cleanPhoneNumber(targetPhone);
  const text = generateBirthdayWishText(params);
  
  if (!cleaned) {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

