/**
 * Canonical helper functions for Receipt item grouping and month sorting.
 * (PD-05: Single canonical implementation shared by AccountantDashboard, AdminDashboard, and ParentDashboard)
 */

export const ACADEMIC_MONTH_ORDER = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

const MONTHS_LOWER_LIST = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

/**
 * Checks if an array of month names form a contiguous, unbroken sequence in academic order (April -> March).
 */
export function areMonthsConsecutive(months: string[]): boolean {
  if (months.length <= 1) return true;

  const indices = months
    .map((m) => ACADEMIC_MONTH_ORDER.indexOf(m))
    .filter((idx) => idx !== -1)
    .sort((a, b) => a - b);

  if (indices.length !== months.length) return false;

  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      return false;
    }
  }

  return true;
}

export interface ReceiptItemInput {
  name?: string;
  description?: string;
  amount: number;
  discount?: number;
  [key: string]: any;
}

export interface GroupedReceiptItem {
  name: string;
  amount: number;
  discount: number;
  months?: string[];
  [key: string]: any;
}

/**
 * Groups multiple receipt items (e.g. monthly fees for siblings or consecutive months)
 * into a single consolidated row when the list contains more than 4 items.
 */
export function getGroupedReceiptItems(items: ReceiptItemInput[]): GroupedReceiptItem[] {
  if (!items || items.length === 0) return [];
  if (items.length <= 4) return items as GroupedReceiptItem[];

  const groups: {
    [key: string]: {
      name: string;
      studentPrefix: string;
      baseFeeHead: string;
      months: string[];
      amount: number;
      discount: number;
    };
  } = {};

  items.forEach((item) => {
    const rawName = item.name || item.description || "";
    let studentPrefix = "";
    let rest = rawName;

    if (rawName.includes(":")) {
      const parts = rawName.split(":");
      studentPrefix = parts[0].trim();
      rest = parts.slice(1).join(":").trim();
    }

    let baseFeeHead = rest;
    let month = "";

    if (rest.includes("-")) {
      const parts = rest.split("-");
      let monthPartIndex = -1;
      for (let i = parts.length - 1; i >= 0; i--) {
        const partLower = parts[i].toLowerCase();
        const hasMonth = MONTHS_LOWER_LIST.some((m) => partLower.includes(m));
        if (hasMonth) {
          monthPartIndex = i;
          break;
        }
      }

      if (monthPartIndex !== -1) {
        month = parts.slice(monthPartIndex).join("-").trim();
        baseFeeHead = parts.slice(0, monthPartIndex).join("-").trim();
      }
    }

    const key = `${studentPrefix}||${baseFeeHead}`;

    if (!groups[key]) {
      groups[key] = {
        name: baseFeeHead,
        studentPrefix,
        baseFeeHead,
        months: [],
        amount: 0,
        discount: 0,
      };
    }

    if (month) {
      const monthLower = month.toLowerCase();
      const matchedMonth = MONTHS_LOWER_LIST.find((m) => monthLower.includes(m));
      if (matchedMonth) {
        const capMonth = matchedMonth.charAt(0).toUpperCase() + matchedMonth.slice(1);
        groups[key].months.push(capMonth);
      }
    }
    groups[key].amount += item.amount;
    groups[key].discount += item.discount || 0;
  });

  return Object.values(groups).map((g) => {
    let finalName = "";
    if (g.studentPrefix) {
      finalName += `${g.studentPrefix}: `;
    }
    finalName += g.baseFeeHead;
    if (g.months.length > 0) {
      // AD-03: Only use "X to Y" range when months are truly consecutive in academic order
      if (g.months.length >= 3 && areMonthsConsecutive(g.months)) {
        const sorted = [...g.months].sort(
          (a, b) => ACADEMIC_MONTH_ORDER.indexOf(a) - ACADEMIC_MONTH_ORDER.indexOf(b)
        );
        finalName += ` (${sorted[0]} to ${sorted[sorted.length - 1]})`;
      } else {
        finalName += ` (${g.months.join(", ")})`;
      }
    }
    return {
      name: finalName,
      amount: g.amount,
      discount: g.discount,
      months: g.months,
    };
  });
}
