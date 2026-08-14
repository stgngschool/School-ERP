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
 * Determines whether a given fee charge/due is due up to the reference month (defaults to current date/month).
 * If today is August 2026, April, May, June, July, August are DUE.
 * September, October, November... are FUTURE items and not yet due.
 */
export function isDueUpToCurrentMonth(
  item: { name?: string; title?: string; dueDate?: string },
  referenceDate = new Date()
): boolean {
  const calMonth = referenceDate.getMonth(); // 0 = Jan, 3 = Apr, 7 = Aug
  const currentAcademicIndex = (calMonth + 9) % 12; // Apr=0, May=1, ..., Aug=4, ..., Mar=11

  const itemName = (item.name || item.title || "").toLowerCase();

  // 1. Check if the item matches any academic month name
  for (let i = 0; i < ACADEMIC_MONTHS.length; i++) {
    const mName = ACADEMIC_MONTHS[i];
    if (itemName.includes(mName)) {
      return i <= currentAcademicIndex;
    }
  }

  // 2. Check dueDate if present
  if (item.dueDate) {
    const dueTime = new Date(item.dueDate).getTime();
    if (!isNaN(dueTime)) {
      // Allow through end of current month
      const endOfCurrentMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59).getTime();
      return dueTime <= endOfCurrentMonth;
    }
  }

  // 3. One-time or annual fees default to true
  return true;
}

export function getCurrentMonthName(date = new Date()): string {
  return date.toLocaleString("en-US", { month: "long" });
}

export function cleanPhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
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

  const itemsBreakdown = activeUnpaidDues
    .slice(0, 5)
    .map((item) => `• ${item.name || item.title || "School Fee"}: ${formatP(item.amount)}`)
    .join("\n");
  
  const moreCount = activeUnpaidDues.length > 5 ? `\n• ...and ${activeUnpaidDues.length - 5} other pending item(s)` : "";

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
${itemsBreakdown || "• Pending Tuition / Academic Fee"} ${moreCount}

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
