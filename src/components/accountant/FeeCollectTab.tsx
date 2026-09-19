"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  CreditCard,
  Search,
  Users,
  Printer,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  CheckCircle,
  Loader2,
  BookOpen,
  ArrowRight,
  UserX,
} from "lucide-react";
import { formatP, toRupees, toPaisa, numberToIndianWords } from "@/lib/currency";
import { getISTDateString, getTodayIST } from "@/lib/dateUtils";
import { isDueUpToCurrentMonth } from "@/lib/whatsapp";
import { enrichReceiptWithStudentDetails } from "@/lib/receipts";
import { MockStudent, MockDueItem, MockReceipt, MockSchoolInfo, SchoolUpiAccount, useAuth } from "@/context/AuthContext";
import QRCode from "qrcode";

interface FeeCollectTabProps {
  students: MockStudent[];
  dueItems: MockDueItem[];
  receipts: MockReceipt[];
  concessions?: { id: string; name: string; percentage: number; feeHeadName: string }[];
  schoolInfo: MockSchoolInfo;
  studentsLoaded: boolean;
  billingLoaded: boolean;
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  onViewStudentProfile: (studentId: string) => void;
  onOpenReceipt: (receipt: any) => void;
  recordItemizedPayment: (
    studentId: string | null,
    items: { ledgerEntryId: string; payAmount: number; discountAmount: number; studentId?: string }[],
    paymentMethod: string,
    transactionRef?: string,
    parentProfileId?: string,
    manualReceiptNo?: string,
    idempotencyKey?: string,
    upiDetails?: { upiAccountId?: string; upiId?: string; upiMerchantName?: string }
  ) => Promise<{ success: boolean; receipt?: any; error?: string }>;
  refreshBilling: () => Promise<void>;
}

export default function FeeCollectTab({
  students,
  dueItems,
  receipts,
  concessions = [],
  schoolInfo,
  studentsLoaded,
  billingLoaded,
  selectedStudentId,
  setSelectedStudentId,
  onViewStudentProfile,
  onOpenReceipt,
  recordItemizedPayment,
  refreshBilling,
}: FeeCollectTabProps) {
  const { showToast } = useAuth();
  const [selectedDueIds, setSelectedDueIds] = useState<string[]>([]);
  const [payMethod, setPayMethod] = useState("CASH");
  const [discountsState, setDiscountsState] = useState<Record<string, number>>({});
  const [payingState, setPayingState] = useState<Record<string, number>>({});
  const [amountReceived, setAmountReceived] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [transferMode, setTransferMode] = useState("NEFT");
  const [activeSiblingTabId, setActiveSiblingTabId] = useState<string | null>(null);
  const [fifoAmount, setFifoAmount] = useState("");
  const [manualReceiptNo, setManualReceiptNo] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Multi-UPI receiving accounts
  const upiAccounts: SchoolUpiAccount[] = useMemo(() => {
    if (schoolInfo.upiAccounts && schoolInfo.upiAccounts.length > 0) {
      return schoolInfo.upiAccounts;
    }
    if (schoolInfo.upiId) {
      return [
        {
          id: "acc-primary",
          label: "Primary School A/C",
          upiId: schoolInfo.upiId,
          merchantName: schoolInfo.upiMerchantName || schoolInfo.name || "St. GNG School",
          isDefault: true,
        },
      ];
    }
    return [];
  }, [schoolInfo]);

  const [selectedUpiAccountId, setSelectedUpiAccountId] = useState<string>("");
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (upiAccounts.length > 0 && (!selectedUpiAccountId || !upiAccounts.some((a) => a.id === selectedUpiAccountId))) {
      const def = upiAccounts.find((a) => a.isDefault) || upiAccounts[0];
      setSelectedUpiAccountId(def.id);
    }
  }, [upiAccounts, selectedUpiAccountId]);

  const activeUpiAccount = useMemo(() => {
    return upiAccounts.find((a) => a.id === selectedUpiAccountId) || upiAccounts[0] || null;
  }, [upiAccounts, selectedUpiAccountId]);

  // Debounced search state (200ms) to prevent jitter and rapid filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const suggestions = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    if (!query) return [];

    return students
      .filter((s) => {
        const name = s.name ? s.name.toLowerCase() : "";
        const adm = s.admissionNo ? s.admissionNo.toLowerCase() : "";
        const roll = s.rollNo ? String(s.rollNo).toLowerCase() : "";
        const parent = s.parentName ? s.parentName.toLowerCase() : "";
        const father = s.fatherName ? s.fatherName.toLowerCase() : "";
        const phone = s.parentPhone ? s.parentPhone : "";
        const mobile = s.fatherMobile ? s.fatherMobile : "";
        const family = s.familyCode ? s.familyCode.toLowerCase() : "";
        const classSec = `${s.class}-${s.section}`.toLowerCase();
        const classOnly = `${s.class}`.toLowerCase();

        return (
          name.includes(query) ||
          adm.includes(query) ||
          roll.includes(query) ||
          parent.includes(query) ||
          father.includes(query) ||
          phone.includes(query) ||
          mobile.includes(query) ||
          family.includes(query) ||
          classSec.includes(query) ||
          classOnly === query
        );
      })
      .slice(0, 10);
  }, [debouncedSearchQuery, students]);


  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSelectedDueIds([]);
    setDiscountsState({});
    setPayingState({});
    setAmountReceived("");
    setDebouncedSearchQuery("");
    setShowSuggestions(false);
  };

  const selectedStudentObj = students.find((s) => s.id === selectedStudentId);

  // Group siblings sharing the same Family ID
  const siblingStudents = useMemo(() => {
    if (!selectedStudentObj) return [];
    if (!selectedStudentObj.familyCode) return [selectedStudentObj];
    return students.filter((s) => s.familyCode === selectedStudentObj.familyCode);
  }, [selectedStudentObj, students]);

  const siblingStudentIds = useMemo(() => {
    return siblingStudents.map((s) => s.id);
  }, [siblingStudents]);

  const selectedStudentDues = useMemo(() => {
    return dueItems
      .filter((d) => siblingStudentIds.includes(d.studentId) && d.status === "UNPAID")
      .slice()
      .sort((a, b) => {
        if (a.isCurrentSession === false && b.isCurrentSession !== false) return -1;
        if (b.isCurrentSession === false && a.isCurrentSession !== false) return 1;
        return (a.dueDate || "").localeCompare(b.dueDate || "");
      });
  }, [siblingStudentIds, dueItems]);

  useEffect(() => {
    if (selectedStudentId) {
      setActiveSiblingTabId(selectedStudentId);
    }
  }, [selectedStudentId]);

  // Memoized student and concession lookup maps for O(1) lookups
  const studentByIdMap = useMemo(() => {
    const map = new Map<string, MockStudent>();
    for (const s of students) map.set(s.id, s);
    return map;
  }, [students]);

  const concessionByIdMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of concessions || []) map.set(c.id, c);
    return map;
  }, [concessions]);
  const getEligibleConcessionDiscount = (due: any) => {
    if (!due) return 0;
    const student = studentByIdMap.get(due.studentId);
    if (!student || !student.concessionId) return 0;
    const concession = concessionByIdMap.get(student.concessionId);
    if (!concession || concession.percentage <= 0) return 0;

    // ── C-08 fix: Prevent substring .includes() from matching 'Late Tuition Fine' when concession is for 'Tuition Fee'
    const dueNameClean = (due.name || "").trim().toLowerCase();
    const concHeadClean = (concession.feeHeadName || "").trim().toLowerCase();
    const isExact = dueNameClean === concHeadClean;
    const isPrefixed = dueNameClean.startsWith(`${concHeadClean} -`) || dueNameClean.startsWith(`${concHeadClean} (`);
    const isMonthlyFee = concHeadClean.includes("tuition") && dueNameClean.includes("tuition") && !dueNameClean.includes("fine") && !dueNameClean.includes("late");
    const feeHeadMatches = isExact || isPrefixed || isMonthlyFee;
    if (!feeHeadMatches) return 0;

    const baseChargeAmount = due.originalAmount || due.amount;
    const fullEligibleDiscount = Math.round((baseChargeAmount * concession.percentage) / 100);
    const remainingEligible = Math.max(0, fullEligibleDiscount - (due.totalDiscount || 0));
    return Math.min(due.amount, remainingEligible);
  };

  const handleToggleDueSelection = (dueId: string) => {
    const due = dueItems.find((d) => d.id === dueId);
    if (!due) return;

    setSelectedDueIds((prev) => {
      const isChecked = prev.includes(dueId);
      if (isChecked) {
        setDiscountsState((d) => {
          const copy = { ...d };
          delete copy[dueId];
          return copy;
        });
        setPayingState((p) => {
          const copy = { ...p };
          delete copy[dueId];
          return copy;
        });
        return prev.filter((id) => id !== dueId);
      } else {
        const autoDiscount = getEligibleConcessionDiscount(due);
        setDiscountsState((d) => ({ ...d, [dueId]: autoDiscount }));
        setPayingState((p) => ({ ...p, [dueId]: Math.max(0, due.amount - autoDiscount) }));
        return [...prev, dueId];
      }
    });
  };

  const handleFIFOAllocate = (amountStr: string) => {
    const totalAmountToAllocateRupees = Number(amountStr) || 0;
    if (totalAmountToAllocateRupees <= 0) {
      setSelectedDueIds([]);
      setPayingState({});
      setDiscountsState({});
      return;
    }

    const sortedDues = [...selectedStudentDues].sort((a, b) => {
      return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
    });

    let remaining = toPaisa(totalAmountToAllocateRupees);
    const newSelectedIds: string[] = [];
    const newPayingState: Record<string, number> = {};
    const newDiscountsState: Record<string, number> = {};

    for (const due of sortedDues) {
      if (remaining <= 0) break;

      newSelectedIds.push(due.id);
      const autoDiscount = getEligibleConcessionDiscount(due);
      newDiscountsState[due.id] = autoDiscount;

      const payableAfterDiscount = Math.max(0, due.amount - autoDiscount);

      if (remaining >= payableAfterDiscount) {
        newPayingState[due.id] = payableAfterDiscount;
        remaining -= payableAfterDiscount;
      } else {
        newPayingState[due.id] = remaining;
        remaining = 0;
      }
    }

    setSelectedDueIds(newSelectedIds);
    setPayingState(newPayingState);
    setDiscountsState(newDiscountsState);
  };

  // ── H-06 fix: Resilient quarter due matcher checking full names, 3-letter abbreviations, and dueDate
  const matchesQuarterDue = (d: { name: string; dueDate?: string }, quarter: "Q1" | "Q2" | "Q3" | "Q4"): boolean => {
    const name = (d.name || "").toLowerCase();
    let dueMonth: number | null = null;
    if (d.dueDate) {
      const parts = d.dueDate.split("-");
      if (parts.length >= 2) {
        const m = parseInt(parts[1], 10);
        if (!isNaN(m) && m >= 1 && m <= 12) {
          dueMonth = m;
        }
      }
    }

    if (quarter === "Q1") {
      return (
        name.includes("april") || name.includes("apr") ||
        name.includes("may") ||
        name.includes("june") || name.includes("jun") ||
        name.includes("previous") || name.includes("past") ||
        name.includes("annual") || name.includes("m/s") || name.includes("admission") ||
        dueMonth === 4 || dueMonth === 5 || dueMonth === 6
      );
    }
    if (quarter === "Q2") {
      return (
        name.includes("july") || name.includes("jul") ||
        name.includes("august") || name.includes("aug") ||
        name.includes("september") || name.includes("sep") ||
        dueMonth === 7 || dueMonth === 8 || dueMonth === 9
      );
    }
    if (quarter === "Q3") {
      return (
        name.includes("october") || name.includes("oct") ||
        name.includes("november") || name.includes("nov") ||
        name.includes("december") || name.includes("dec") ||
        dueMonth === 10 || dueMonth === 11 || dueMonth === 12
      );
    }
    if (quarter === "Q4") {
      return (
        name.includes("january") || name.includes("jan") ||
        name.includes("february") || name.includes("feb") ||
        name.includes("march") || name.includes("mar") ||
        dueMonth === 1 || dueMonth === 2 || dueMonth === 3
      );
    }
    return false;
  };

  const handleSelectQuickFilter = (type: "Q1" | "Q2" | "Q3" | "Q4" | "TUITION" | "FULL_YEAR") => {
    const activeChildId = activeSiblingTabId || selectedStudentId;
    const childDues = selectedStudentDues.filter((d) => d.studentId === activeChildId);
    if (childDues.length === 0) return;

    let targetDues: typeof childDues = [];
    if (type === "Q1" || type === "Q2" || type === "Q3" || type === "Q4") {
      targetDues = childDues.filter((d) => matchesQuarterDue(d, type));
    } else if (type === "TUITION") {
      targetDues = childDues.filter((d) => d.name.toLowerCase().includes("tuition"));
    } else if (type === "FULL_YEAR") {
      targetDues = childDues;
    }

    if (targetDues.length === 0) return;

    const targetIds = targetDues.map((d) => d.id);
    setSelectedDueIds((prev) => Array.from(new Set([...prev, ...targetIds])));
    setDiscountsState((prev) => {
      const next = { ...prev };
      targetDues.forEach((d) => {
        if (next[d.id] === undefined) next[d.id] = 0;
      });
      return next;
    });
    setPayingState((prev) => {
      const next = { ...prev };
      targetDues.forEach((d) => {
        if (next[d.id] === undefined) next[d.id] = d.amount;
      });
      return next;
    });
  };

  const handleOfflinePayment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSubmittingPayment) return;
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student || selectedDueIds.length === 0) return;

    try {
      setIsSubmittingPayment(true);
      const unpaidItems = dueItems.filter((d) => selectedDueIds.includes(d.id));
      const items = selectedDueIds.map((dueId) => ({
        ledgerEntryId: dueId,
        payAmount: payingState[dueId] ?? 0,
        discountAmount: discountsState[dueId] ?? 0,
        studentId: dueItems.find((d) => d.id === dueId)?.studentId,
      }));

      const totalPaid = items.reduce((sum, item) => sum + item.payAmount, 0);
      const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
      const originalDueSum = unpaidItems.reduce((sum, item) => sum + item.amount, 0);
      const remainingArrears = originalDueSum - totalPaid - totalDiscount;

      if (totalPaid <= 0 && totalDiscount <= 0) {
        setIsSubmittingPayment(false);
        return;
      }

      let finalTransactionRef = transactionRef ? transactionRef.trim() : "";
      if (payMethod === "CHEQUE") {
        finalTransactionRef = `Cheque No: ${chequeNo || "N/A"} | Bank: ${chequeBank || "N/A"}${
          chequeDate ? ` | Date: ${chequeDate}` : ""
        }`;
      } else if (payMethod === "BANK_TRANSFER") {
        finalTransactionRef = transactionRef && transactionRef.trim()
          ? `${transferMode} Ref: ${transactionRef.trim()}${chequeBank ? ` | Bank: ${chequeBank}` : ""}`
          : `${transferMode}${chequeBank ? ` | Bank: ${chequeBank}` : ""}`;
      } else if (payMethod === "UPI") {
        finalTransactionRef = transactionRef && transactionRef.trim()
          ? `UPI UTR: ${transactionRef.trim()}`
          : "";
      }

      const cleanManualNo = manualReceiptNo && manualReceiptNo.trim() ? manualReceiptNo.trim() : undefined;
      const clientKey = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined;
      const upiDetails = payMethod === "UPI" && activeUpiAccount ? {
        upiAccountId: activeUpiAccount.id,
        upiId: activeUpiAccount.upiId,
        upiMerchantName: activeUpiAccount.merchantName,
      } : undefined;

      const payRes = await recordItemizedPayment(
        null,
        items,
        payMethod,
        finalTransactionRef || undefined,
        undefined,
        cleanManualNo,
        clientKey,
        upiDetails
      );
      if (!payRes.success) {
        showToast("error", "Payment Failed", payRes.error || "Payment failed. Please check backend logs or try again.");
        setIsSubmittingPayment(false);
        return;
      }

      if (payRes.receipt?.isDuplicateRetry) {
        showToast("warning", "Payment Already Recorded", `This transaction was already recorded earlier (Receipt #${payRes.receipt.receiptNo}).`);
        setIsSubmittingPayment(false);
        await refreshBilling();
        return;
      }

      const totalRemainingOnSelectedInvoices = remainingArrears;
      const familyOtherDuesSum = dueItems
        .filter(
          (d) =>
            siblingStudentIds.includes(d.studentId) &&
            d.status === "UNPAID" &&
            !selectedDueIds.includes(d.id)
        )
        .reduce((sum, item) => sum + item.amount, 0);

      const isSingleSibling = siblingStudents.length === 1;

      if (!payRes.receipt?.receiptNo) {
        showToast("error", "Transaction Warning", "Payment was recorded but server did not return a valid receipt number.");
        setIsSubmittingPayment(false);
        await refreshBilling();
        return;
      }

      const serverRec = payRes.receipt;
      const matchedReceipt = {
        receiptNo: serverRec.receiptNo,
        manualReceiptNo: serverRec.manualReceiptNo || cleanManualNo || null,
        studentName: isSingleSibling
          ? student.name
          : `Family (Siblings: ${siblingStudents.map((s) => s.name).join(", ")})`,
        classSection: isSingleSibling ? `${student.class}-${student.section}` : "Unified Family",
        admissionNo: isSingleSibling ? student.admissionNo : student.familyCode || "Multi",
        fatherName: student.fatherName || student.parentName || "Parent",
        subtotal: serverRec.subtotal !== undefined ? serverRec.subtotal : originalDueSum,
        amount: serverRec.amount !== undefined ? serverRec.amount : totalPaid,
        method: serverRec.paymentMethod || payMethod,
        discount: serverRec.discount !== undefined ? serverRec.discount : totalDiscount,
        arrears: serverRec.arrears !== undefined ? serverRec.arrears : totalRemainingOnSelectedInvoices,
        otherArrears: serverRec.otherArrears !== undefined ? serverRec.otherArrears : familyOtherDuesSum,
        totalFamilyDueRemaining:
          serverRec.totalFamilyDueRemaining !== undefined
            ? serverRec.totalFamilyDueRemaining
            : familyOtherDuesSum + totalRemainingOnSelectedInvoices,
        transactionRef: serverRec.transactionRef || finalTransactionRef || "",
        upiId: serverRec.upiId || (payMethod === "UPI" ? activeUpiAccount?.upiId : undefined),
        upiMerchantName: serverRec.upiMerchantName || (payMethod === "UPI" ? activeUpiAccount?.merchantName : undefined),
        amountInWords:
          serverRec.amountInWords ||
          numberToIndianWords(serverRec.amount !== undefined ? serverRec.amount : totalPaid),
        details: items
          .map((i) => {
            const itemObj = unpaidItems.find((ui) => ui.id === i.ledgerEntryId);
            const itemDesc = itemObj?.name || "";
            const child = students.find((s) => s.id === itemObj?.studentId);
            const prefix = child ? `${child.name}: ` : "";
            return `${prefix}${itemDesc} (Paid: ${formatP(i.payAmount)}${
              i.discountAmount > 0 ? `, Disc: ${formatP(i.discountAmount)}` : ""
            })`;
          })
          .join(" + "),
        items: items.map((i) => {
          const itemObj = unpaidItems.find((ui) => ui.id === i.ledgerEntryId);
          const itemDesc = itemObj?.name || "";
          const child = students.find((s) => s.id === itemObj?.studentId);
          const origAmt = itemObj?.amount || 0;
          const bal = Math.max(0, origAmt - i.payAmount - i.discountAmount);
          return {
            name: child ? `${child.name}: ${itemDesc}` : itemDesc,
            originalAmount: origAmt,
            amount: i.payAmount,
            discount: i.discountAmount,
            balance: bal,
          };
        }),
        createdAt: serverRec.createdAt
          ? getISTDateString(serverRec.createdAt)
          : getTodayIST(),
      };

      onOpenReceipt(matchedReceipt);
      setSelectedDueIds([]);
      setDiscountsState({});
      setPayingState({});
      setAmountReceived("");
      setTransactionRef("");
      setManualReceiptNo("");
      setSelectedStudentId("");
      setSearchQuery("");
    } catch (error) {
      console.error("Payment submission error:", error);
      showToast("error", "Payment Error", "An unexpected error occurred while recording the payment.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };
  if (!studentsLoaded || !billingLoaded) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6 animate-pulse">
        <div className="inline-flex p-3.5 bg-slate-100 rounded-2xl h-14 w-14" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 w-48 mx-auto rounded" />
          <div className="h-3 bg-slate-100 w-96 mx-auto rounded" />
        </div>
        <div className="h-12 bg-slate-50 border border-slate-200 rounded-xl max-w-lg mx-auto" />
      </div>
    );
  }

  return (
    <div>
      {!selectedStudentId ? (
        /* SEARCH VIEW (No student selected) */
        <div className="max-w-2xl mx-auto py-10 px-4 text-center space-y-6 min-h-[500px]">
          <div className="inline-flex p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 shadow-[0_8px_30px_rgba(16,185,129,0.12)] cursor-default">
            <CreditCard className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Counter Fee Collection</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Search for a student by their Name, Admission Number, or Family Code to access their billing ledger.
            </p>
          </div>

          {/* Search Input Container */}
          <div className="relative max-w-lg mx-auto">
            <div className="relative shadow-sm rounded-2xl border border-slate-200 bg-white p-1 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-100/70 transition-all duration-200">
              <div className="flex items-center">
                <Search className="h-5 w-5 text-emerald-600 ml-3 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Type student name, admission no, or family code..."
                  className="w-full text-xs font-bold py-3 px-3 outline-none border-none bg-transparent text-slate-800 placeholder-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setDebouncedSearchQuery("");
                      setSelectedStudentId("");
                      setSelectedDueIds([]);
                      setDiscountsState({});
                      setPayingState({});
                    }}
                    className="py-1 px-2.5 text-slate-400 hover:text-slate-700 text-[10px] font-bold mr-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Inline Results List or Quick Info Grid */}
          {debouncedSearchQuery.trim().length > 0 ? (
            <div className="max-w-lg mx-auto bg-white border border-slate-200/90 rounded-2xl shadow-sm divide-y divide-slate-100 text-left overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-black uppercase text-slate-500 tracking-wider">
                <span>Search Results</span>
                <span>{suggestions.length} matches found</span>
              </div>
              {suggestions.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                  {suggestions.map((s) => {
                    const studentDueSum = dueItems
                      .filter((d) => d.studentId === s.id && d.status === "UNPAID")
                      .reduce((sum, i) => sum + i.amount, 0);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          handleStudentSelect(s.id);
                          setSearchQuery(`${s.name} (${s.class}-${s.section})`);
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-3 hover:bg-emerald-50/60 text-xs transition-all flex justify-between items-center cursor-pointer group cv-auto-row"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 transition-colors shadow-2xs ${
                              s.isRte
                                ? "bg-purple-100 border-purple-200 text-purple-700 group-hover:bg-purple-600 group-hover:text-white"
                                : "bg-emerald-50 border-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white"
                            }`}
                          >
                            {s.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-850 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-slate-900 uppercase text-xs">{s.name}</span>
                              {s.isRte && (
                                <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md border border-purple-200 shrink-0">
                                  RTE Govt Quota
                                </span>
                              )}
                              {s.familyCode && (
                                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                                  Fam: {s.familyCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                              Class {s.class}-{s.section} &bull; Adm:{" "}
                              <span className="text-slate-600 font-bold">{s.admissionNo}</span> &bull; Parent:{" "}
                              <span className="text-slate-600">{s.parentName || s.fatherName || "N/A"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {s.isRte ? (
                            <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              RTE (100% Free)
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                                studentDueSum > 0
                                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              }`}
                            >
                              {formatP(studentDueSum)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs font-semibold text-slate-400">
                  No students found matching "{debouncedSearchQuery}".
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        /* SELECTED STUDENT FLOW (Fees detail and Collect Fee) */
        <div className="space-y-6">
          {/* Header Student Panel Card */}
          <div className="bg-slate-900 sm:rounded-2xl rounded-xl p-3 sm:p-5 text-white shadow-lg relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="absolute right-0 top-0 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-2">
              <button
                onClick={() => {
                  setSelectedStudentId("");
                  setSearchQuery("");
                  setSelectedDueIds([]);
                  setDiscountsState({});
                  setPayingState({});
                }}
                className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-300 hover:text-white transition-colors cursor-pointer bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Search
              </button>

              <button
                type="button"
                onClick={() => selectedStudentId && onViewStudentProfile(selectedStudentId)}
                className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-indigo-300 hover:text-white transition-colors cursor-pointer bg-slate-850/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-indigo-700/50 ml-2"
              >
                View Full Profile
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg font-black tracking-tight">{selectedStudentObj?.name}</h3>
                <span className="text-[9px] font-black uppercase bg-indigo-600/60 text-white px-2 py-0.5 rounded-full border border-indigo-500/50">
                  Class {selectedStudentObj?.class}-{selectedStudentObj?.section}
                </span>
                {selectedStudentObj?.isRte && (
                  <span className="text-[9px] font-black uppercase bg-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-full border border-purple-400/50 flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" /> RTE Free Education (Govt Quota)
                  </span>
                )}
                {selectedStudentObj?.familyCode && (
                  <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Family Code: {selectedStudentObj?.familyCode}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 text-slate-300 text-[10px] font-semibold">
                <p>
                  Admission No: <span className="font-bold text-white">{selectedStudentObj?.admissionNo}</span>
                </p>
                <p>
                  Parent Name: <span className="font-bold text-white">{selectedStudentObj?.parentName}</span>
                </p>
                <p>
                  Parent Phone: <span className="font-bold text-white">{selectedStudentObj?.parentPhone}</span>
                </p>
                {siblingStudents.length > 1 && (
                  <p className="text-amber-400">
                    Siblings: <span className="font-bold">{siblingStudents.length} Children Linked</span>
                  </p>
                )}
              </div>
            </div>

            <div className="text-left lg:text-right space-y-1 shrink-0 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/30">
              <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                Total Outstanding Dues
              </span>
              <h3
                className={`text-xl font-black tracking-tight ${
                  selectedStudentObj?.isRte ? "text-purple-300" : "text-rose-400"
                }`}
              >
                {formatP(selectedStudentDues.reduce((sum, item) => sum + item.amount, 0))}
              </h3>
              <p
                className={`text-[9px] font-bold ${
                  selectedStudentObj?.isRte ? "text-purple-300" : "text-slate-300"
                }`}
              >
                {selectedStudentObj?.isRte
                  ? "100% Free Education (Govt RTE)"
                  : `${selectedStudentDues.length} Unpaid Invoices`}
              </p>
            </div>
          </div>
          {/* Main Ledger & Checkout Panel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Col: Invoice List grouped by Child */}
            <div className="lg:col-span-3 space-y-4">
              {/* Sibling Tabs */}
              {siblingStudents.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                    Select Family Member
                  </label>
                  <div className="flex flex-wrap gap-2 pb-1.5 border-b border-slate-100">
                    {siblingStudents.map((child) => {
                      const childDues = selectedStudentDues.filter((d) => d.studentId === child.id);
                      const childDueSum = childDues.reduce((sum, d) => sum + d.amount, 0);
                      const childSelectedCount = childDues.filter((d) => selectedDueIds.includes(d.id)).length;
                      const isActive = (activeSiblingTabId || selectedStudentId) === child.id;

                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => setActiveSiblingTabId(child.id)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-150 cursor-pointer text-left shrink-0 ${
                            isActive
                              ? "bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-600/10 text-white"
                              : "bg-white border-slate-200/80 text-slate-600 hover:border-slate-350"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isActive ? "bg-white animate-pulse" : "bg-indigo-500"
                            }`}
                          />
                          <div>
                            <span className="block text-xs font-black tracking-tight leading-tight">{child.name}</span>
                            <span
                              className={`block text-[8px] mt-0.5 font-bold ${
                                isActive ? "text-indigo-200" : "text-slate-400"
                              }`}
                            >
                              Class {child.class}-{child.section} • {childDues.length} dues ({formatP(childDueSum)})
                            </span>
                          </div>
                          {childSelectedCount > 0 && (
                            <span
                              className={`text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                                isActive
                                  ? "bg-white text-indigo-700 font-extrabold"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              }`}
                            >
                              {childSelectedCount} selected
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Header with Quick Presets */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-100 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Outstanding Invoices</h4>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                    Select and configure the dues to collect now.
                  </p>
                </div>

                {selectedStudentDues.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = selectedStudentDues.map((d) => d.id);
                        setSelectedDueIds(allIds);
                        const newD = { ...discountsState };
                        const newP = { ...payingState };
                        selectedStudentDues.forEach((due) => {
                          const autoDiscount = getEligibleConcessionDiscount(due);
                          newD[due.id] = autoDiscount;
                          newP[due.id] = Math.max(0, due.amount - autoDiscount);
                        });
                        setDiscountsState(newD);
                        setPayingState(newP);
                      }}
                      className="text-[9px] font-black uppercase text-indigo-700 hover:text-indigo-850 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Select All (All Children)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const activeChildId = activeSiblingTabId || selectedStudentId;
                        const activeChildDues = selectedStudentDues.filter((d) => d.studentId === activeChildId);
                        const activeChildIds = activeChildDues.map((d) => d.id);

                        setSelectedDueIds((prev) => {
                          const next = [...prev];
                          activeChildIds.forEach((id) => {
                            if (!next.includes(id)) next.push(id);
                          });
                          return next;
                        });

                        setDiscountsState((d) => {
                          const next = { ...d };
                          activeChildDues.forEach((due) => {
                            next[due.id] = getEligibleConcessionDiscount(due);
                          });
                          return next;
                        });

                        setPayingState((p) => {
                          const next = { ...p };
                          activeChildDues.forEach((due) => {
                            const autoDiscount = getEligibleConcessionDiscount(due);
                            next[due.id] = Math.max(0, due.amount - autoDiscount);
                          });
                          return next;
                        });
                      }}
                      className="text-[9px] font-black uppercase text-slate-700 hover:text-slate-850 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Select Active Child
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDueIds([]);
                        setDiscountsState({});
                        setPayingState({});
                      }}
                      className="text-[9px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Select Term & Quarter Filters */}
              {selectedStudentDues.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[9px] font-black uppercase tracking-wider touch-scroll-x bg-slate-50/80 p-2 rounded-xl border border-slate-200/60">
                  <span className="text-slate-400 flex items-center gap-1 shrink-0 mr-1 font-bold">
                    <Sparkles className="h-3 w-3 text-amber-500" /> Fast Select:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectQuickFilter("Q1")}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 border border-indigo-200/80 rounded-lg transition-all cursor-pointer shrink-0 shadow-2xs"
                  >
                    Q1 (Apr-Jun)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQuickFilter("Q2")}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 border border-indigo-200/80 rounded-lg transition-all cursor-pointer shrink-0 shadow-2xs"
                  >
                    Q2 (Jul-Sep)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQuickFilter("Q3")}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 border border-indigo-200/80 rounded-lg transition-all cursor-pointer shrink-0 shadow-2xs"
                  >
                    Q3 (Oct-Dec)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQuickFilter("Q4")}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 border border-indigo-200/80 rounded-lg transition-all cursor-pointer shrink-0 shadow-2xs"
                  >
                    Q4 (Jan-Mar)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQuickFilter("TUITION")}
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-700 border border-purple-200/80 rounded-lg transition-all cursor-pointer shrink-0 shadow-2xs"
                  >
                    Tuition Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQuickFilter("FULL_YEAR")}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 border border-emerald-200/80 rounded-lg transition-all cursor-pointer shrink-0 shadow-2xs"
                  >
                    Full Year
                  </button>
                </div>
              )}

              {/* Focused Child Invoice List */}
              <div>
                {(() => {
                  const childId = activeSiblingTabId || selectedStudentId;
                  const child = siblingStudents.find((s) => s.id === childId);
                  if (!child) return null;
                  const childDues = selectedStudentDues.filter((d) => d.studentId === child.id);

                  if (childDues.length === 0) {
                    if (child.isRte) {
                      return (
                        <div className="text-center py-10 bg-purple-50/60 border border-purple-200/80 rounded-2xl space-y-3 p-6">
                          <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center mx-auto shadow-sm">
                            <GraduationCap className="h-6 w-6" />
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-purple-200/80 text-purple-800 rounded-full border border-purple-300">
                              RTE Student &bull; Govt Free Quota
                            </span>
                            <h4 className="text-sm font-black text-purple-950 mt-2">100% Fee Waived Under RTE Act</h4>
                            <p className="text-[11px] text-purple-700/90 font-medium max-w-md mx-auto mt-1">
                              {child.name} is enrolled under the Right to Education (RTE) Scheme. Monthly tuition and
                              standard annual fees are 100% exempted under government mandate. Current fee payable is
                              ₹0.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                        <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
                        <div>
                          <p className="text-xs font-black text-slate-800">All Fees Cleared</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            No outstanding invoices remain for {child.name}.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm">
                      <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800">{child.name}</span>
                          <span className="text-[9px] font-black uppercase bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                            Class {child.class}-{child.section}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">
                          {childDues.length} Outstanding Items
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 p-2 space-y-2 max-h-[480px] overflow-y-auto">
                        {childDues.map((due) => {
                          const isChecked = selectedDueIds.includes(due.id);
                          const isPast = due.isCurrentSession === false;
                          const isOverdue = isDueUpToCurrentMonth(due);

                          return (
                            <div
                              key={due.id}
                              className={`p-3.5 border rounded-2xl text-xs space-y-3 transition-all duration-150 cv-auto-row ${
                                isChecked
                                  ? "bg-emerald-50/20 border-emerald-300 shadow-sm"
                                  : "bg-white border-slate-200/70 hover:border-emerald-200 hover:bg-slate-50/40"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleDueSelection(due.id)}
                                    className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5 mt-0.5 cursor-pointer shrink-0"
                                  />
                                  <div className="space-y-0.5">
                                    <div className="flex items-center flex-wrap gap-2">
                                      <span className="font-extrabold text-slate-850 text-xs">{due.name}</span>
                                      {isPast ? (
                                        <span className="inline-flex items-center text-[8px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md leading-none">
                                          Past Due ({due.sessionName || "Previous Session"})
                                        </span>
                                      ) : isOverdue ? (
                                        <span className="inline-flex items-center text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md leading-none">
                                          Due / Current
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md leading-none">
                                          Upcoming
                                        </span>
                                      )}
                                      {due.totalPaid && due.totalPaid > 0 ? (
                                        <span className="inline-flex items-center text-[8px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md leading-none">
                                          {formatP(due.totalPaid)} Paid
                                        </span>
                                      ) : null}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 block">
                                      Due Date: <span className="text-slate-600">{due.dueDate || "N/A"}</span>
                                      {due.originalAmount && due.originalAmount !== due.amount
                                        ? ` • Original: ${formatP(due.originalAmount)}`
                                        : ""}
                                    </span>
                                  </div>
                                </label>
                                <span className="font-black text-slate-900 text-sm shrink-0">{formatP(due.amount)}</span>
                              </div>

                              {isChecked && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-3 border-t border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider animate-in fade-in duration-150">
                                  <div>
                                    <span className="block mb-1 text-slate-500">Discount (₹)</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max={toRupees(due.amount)}
                                      value={
                                        discountsState[due.id] === undefined || discountsState[due.id] === 0
                                          ? ""
                                          : toRupees(discountsState[due.id])
                                      }
                                      placeholder="0"
                                      onChange={(e) => {
                                        const raw = e.target.value.replace(/^0+(?=\d)/, "");
                                        const discRupees = Math.max(
                                          0,
                                          Math.min(toRupees(due.amount), Number(raw) || 0)
                                        );
                                        const discPaisa = toPaisa(discRupees);
                                        setDiscountsState((d) => ({ ...d, [due.id]: raw === "" ? 0 : discPaisa }));

                                        setPayingState((p) => {
                                          const currentPay = p[due.id] ?? due.amount;
                                          const maxPayAllowed = due.amount - (raw === "" ? 0 : discPaisa);
                                          return { ...p, [due.id]: Math.min(currentPay, maxPayAllowed) };
                                        });
                                      }}
                                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-emerald-500 shadow-2xs"
                                    />
                                  </div>
                                  <div>
                                    <span className="block mb-1 text-slate-500">Paying Amount (₹)</span>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        min="0"
                                        max={toRupees(due.amount - (discountsState[due.id] ?? 0))}
                                        value={
                                          payingState[due.id] === undefined
                                            ? toRupees(due.amount)
                                            : payingState[due.id] === 0 &&
                                              (discountsState[due.id] ?? 0) !== due.amount
                                            ? ""
                                            : toRupees(payingState[due.id])
                                        }
                                        placeholder="0"
                                        onChange={(e) => {
                                          const raw = e.target.value.replace(/^0+(?=\d)/, "");
                                          const disc = discountsState[due.id] ?? 0;
                                          const maxPayRupees = toRupees(due.amount - disc);
                                          const payRupees = Math.max(0, Math.min(maxPayRupees, Number(raw) || 0));
                                          const payPaisa = toPaisa(payRupees);
                                          setPayingState((p) => ({ ...p, [due.id]: raw === "" ? 0 : payPaisa }));
                                        }}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-emerald-500 pr-24 shadow-2xs"
                                      />
                                      <div className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center gap-1">
                                        <button
                                          type="button"
                                          title="Set paying amount to ₹0 (Waiver / Discount only)"
                                          onClick={() => {
                                            setPayingState((p) => ({ ...p, [due.id]: 0 }));
                                          }}
                                          className="px-2 py-0.5 bg-slate-200/90 hover:bg-slate-300 active:scale-95 text-[10px] font-black text-slate-750 rounded-lg transition-all cursor-pointer shadow-2xs"
                                        >
                                          ₹0
                                        </button>
                                        <button
                                          type="button"
                                          title="Pay full remaining amount"
                                          onClick={() => {
                                            const disc = discountsState[due.id] ?? 0;
                                            setPayingState((p) => ({ ...p, [due.id]: due.amount - disc }));
                                          }}
                                          className="px-2.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 active:scale-95 text-[10px] font-black text-emerald-800 border border-emerald-300/70 rounded-lg transition-all cursor-pointer shadow-2xs"
                                        >
                                          FULL
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col justify-end text-right">
                                    <span className="block text-slate-500 mb-1">Arrears Remaining</span>
                                    <span className="text-xs font-black text-rose-600 py-2">
                                      {formatP(
                                        due.amount -
                                          (discountsState[due.id] ?? 0) -
                                          (payingState[due.id] ?? due.amount)
                                      )}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Family Payment History */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Family Payment History</h4>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {receipts
                    .filter(
                      (r) =>
                        siblingStudentIds.includes(r.studentId as string) ||
                        (r.studentIds && r.studentIds.some((id: string) => siblingStudentIds.includes(id)))
                    )
                    .map((rec) => (
                      <div
                        key={rec.id}
                        onClick={() => {
                          onOpenReceipt(enrichReceiptWithStudentDetails(rec, students));
                        }}
                        className="p-3 border border-slate-100 bg-slate-50/40 hover:bg-slate-100/60 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer transition-all hover:scale-[1.01] duration-150"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{rec.studentName}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            Receipt: {rec.receiptNo}{" "}
                            {rec.manualReceiptNo ? `(Book #: ${rec.manualReceiptNo})` : ""} | {rec.createdAt}
                          </p>
                          <p className="text-[8px] text-indigo-600 font-bold max-w-sm truncate mt-0.5">
                            {rec.details}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1 shrink-0">
                          <p className="font-extrabold text-slate-800">{formatP(rec.amount)}</p>
                          <span className="text-[8px] font-black uppercase bg-green-50 text-green-700 border border-green-100 px-1.5 py-0.5 rounded">
                            {rec.method} Verified
                          </span>
                        </div>
                      </div>
                    ))}

                  {receipts.filter(
                    (r) =>
                      siblingStudentIds.includes(r.studentId as string) ||
                      (r.studentIds && r.studentIds.some((id: string) => siblingStudentIds.includes(id)))
                  ).length === 0 && (
                    <p className="text-[10px] text-slate-400 font-semibold italic text-center py-4 bg-slate-50/50 rounded-lg">
                      No receipts found for this family ledger.
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* Right Col: Checkout & Calculators Panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-50 border border-slate-200/60 sm:rounded-2xl rounded-xl p-3 sm:p-4.5 space-y-4 shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Payment Summary</h4>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Review totals and payment mode details.</p>
                </div>

                {/* Quick FIFO Allocation Tool */}
                {selectedStudentDues.length > 0 && (
                  <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-3.5 space-y-2">
                    <label className="text-[9px] font-black text-indigo-750 uppercase tracking-wider block">
                      Smart Auto-Allocate (FIFO)
                    </label>
                    <p className="text-[9px] text-slate-400 font-semibold leading-tight">
                      Type an amount to automatically select and pay the oldest outstanding dues first.
                    </p>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        placeholder="Enter amount (e.g. 5000)..."
                        value={fifoAmount}
                        onChange={(e) => setFifoAmount(e.target.value)}
                        className="flex-1 text-xs font-bold py-1.5 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-650"
                      />
                      <button
                        type="button"
                        onClick={() => handleFIFOAllocate(fifoAmount)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shadow-sm shrink-0"
                      >
                        Allocate
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleOfflinePayment} className="space-y-4">
                  {/* Net Payable & Discount Sticky */}
                  <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-xl px-4 py-1">
                    <div className="flex justify-between items-center py-3 text-xs font-semibold text-slate-500">
                      <span>Selected Items:</span>
                      <span className="font-bold text-slate-700">{selectedDueIds.length} Invoice(s)</span>
                    </div>

                    {/* Sibling Breakdown if multiple children selected */}
                    {siblingStudents.length > 1 && selectedDueIds.length > 0 && (
                      <div className="py-2.5 space-y-1.5 bg-slate-50/70 -mx-4 px-4 border-y border-slate-100">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                          Sibling Breakdown:
                        </span>
                        {siblingStudents.map((child) => {
                          const childDueIds = selectedDueIds.filter((id) => {
                            const item = dueItems.find((d) => d.id === id);
                            return item?.studentId === child.id;
                          });
                          if (childDueIds.length === 0) return null;
                          const childPay = childDueIds.reduce((sum, id) => sum + (payingState[id] ?? 0), 0);
                          const childDisc = childDueIds.reduce((sum, id) => sum + (discountsState[id] ?? 0), 0);

                          return (
                            <div key={child.id} className="flex items-center justify-between text-xs py-0.5">
                              <span className="font-bold text-slate-700 truncate max-w-[130px]">
                                {child.name}:
                              </span>
                              <div className="text-right">
                                <span className="font-extrabold text-indigo-600">{formatP(childPay)}</span>
                                {childDisc > 0 && (
                                  <span className="text-[9px] font-bold text-emerald-600 ml-1.5">
                                    (Disc: {formatP(childDisc)})
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex justify-between items-center py-3 text-xs font-semibold text-slate-500">
                      <span>Total Discount:</span>
                      <span className="font-extrabold text-green-600">
                        {formatP(selectedDueIds.reduce((sum, id) => sum + (discountsState[id] ?? 0), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 text-xs font-bold text-slate-800">
                      <span>Net Payable Amount:</span>
                      <span className="text-sm font-black text-indigo-600">
                        {formatP(selectedDueIds.reduce((sum, id) => sum + (payingState[id] ?? 0), 0))}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Payment Methods Button Grid */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Choose Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "CASH", label: "Cash Counter" },
                        { id: "UPI", label: "UPI QR Scan" },
                        { id: "CHEQUE", label: "Bank Cheque" },
                        { id: "BANK_TRANSFER", label: "Direct Transfer" },
                      ].map((method) => {
                        const isActive = payMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setPayMethod(method.id)}
                            className={`p-2.5 border rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isActive
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                : "bg-white border-slate-200/80 hover:border-indigo-300 text-slate-600"
                            }`}
                          >
                            <span className="text-[10px] font-bold block">{method.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* UPI Dynamic QR Code Selector */}
                  {payMethod === "UPI" && (() => {
                    const netPayable = selectedDueIds.reduce((sum, id) => sum + (payingState[id] ?? 0), 0);
                    const destUpiId = activeUpiAccount?.upiId || schoolInfo.upiId || "8423926608@upi";
                    const destMerchant = activeUpiAccount?.merchantName || schoolInfo.upiMerchantName || schoolInfo.name || "St. GNG School";
                    const upiLink = `upi://pay?pa=${destUpiId}&pn=${encodeURIComponent(
                      destMerchant
                    )}&am=${(netPayable / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent("School Fees")}`;
                    const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      upiLink
                    )}`;

                    return (
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 flex flex-col items-center justify-center gap-3 text-center animate-in slide-in-from-top-2 duration-200 shadow-2xs">
                        {/* Account Selector if multiple accounts exist */}
                        {upiAccounts.length > 1 ? (
                          <div className="w-full space-y-1.5 text-left border-b border-slate-100 pb-3">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                              Select School Receiving Account
                            </label>
                            <div className="grid grid-cols-1 gap-1.5">
                              {upiAccounts.map((acc) => {
                                const isSelected = (activeUpiAccount?.id || upiAccounts[0].id) === acc.id;
                                return (
                                  <button
                                    key={acc.id}
                                    type="button"
                                    onClick={() => setSelectedUpiAccountId(acc.id)}
                                    className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-indigo-50/90 border-indigo-600 text-indigo-950 font-bold shadow-2xs ring-1 ring-indigo-500/20"
                                        : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70 font-medium"
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-black truncate">{acc.label}</span>
                                        {acc.isDefault && (
                                          <span className="text-[7.5px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                            Default
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[9.5px] text-slate-500 font-mono truncate">{acc.upiId}</p>
                                    </div>
                                    <div
                                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                        isSelected
                                          ? "border-indigo-600 bg-indigo-600 text-white"
                                          : "border-slate-300 bg-white"
                                      }`}
                                    >
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : upiAccounts.length === 1 ? (
                          <div className="w-full bg-slate-50 border border-slate-200/80 p-2 rounded-xl text-left">
                            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">
                              Receiving UPI Account
                            </span>
                            <p className="text-xs font-black text-slate-900 leading-tight">
                              {upiAccounts[0].label} <span className="text-[10px] text-indigo-600 font-mono font-bold">({upiAccounts[0].upiId})</span>
                            </p>
                          </div>
                        ) : null}

                        <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider block">
                          Scan Dynamic Locked-Amount QR
                        </span>

                        <div className="relative p-2 bg-slate-50 rounded-xl border border-slate-200/50 shadow-2xs">
                          <img
                            src={upiQrDataUrl || fallbackQrUrl}
                            alt="UPI QR Code"
                            className="w-36 h-36 mx-auto object-contain"
                          />
                          <div className="absolute inset-x-2 top-2 h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-bounce" />
                        </div>

                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-indigo-600 font-mono">{formatP(netPayable)}</p>
                          <p className="text-[8px] text-slate-400 font-semibold leading-tight max-w-[200px] mx-auto">
                            Scan via PhonePe, Google Pay, Paytm, or BHIM. Amount is fixed & non-editable.
                          </p>
                        </div>

                        <div className="w-full space-y-1 text-left border-t border-slate-100 pt-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                              UPI Transaction Ref ID (UTR)
                            </label>
                            <span className="text-[8px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded tracking-wider">
                              OPTIONAL
                            </span>
                          </div>
                          <input
                            type="text"
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value)}
                            placeholder="Optional UTR / Ref No (khali bhi chhod sakte hain)..."
                            className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-650 focus:ring-1 focus:ring-indigo-100"
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Cheque Details Form */}
                  {payMethod === "CHEQUE" && (
                    <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2.5 text-xs animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
                        <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider">
                          Cheque Details
                        </span>
                        <span className="text-[8px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                          Clearing Verification
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 block mb-1">Cheque Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 482910"
                            value={chequeNo}
                            onChange={(e) => setChequeNo(e.target.value)}
                            className="w-full text-xs font-bold p-2 bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500 shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 block mb-1">Bank Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. SBI / HDFC"
                            value={chequeBank}
                            onChange={(e) => setChequeBank(e.target.value)}
                            className="w-full text-xs font-bold p-2 bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500 shadow-2xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-slate-500 block mb-1">Cheque Date</label>
                        <input
                          type="date"
                          value={chequeDate}
                          onChange={(e) => setChequeDate(e.target.value)}
                          className="w-full text-xs font-bold p-2 bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500 shadow-2xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Bank Transfer Details Form */}
                  {payMethod === "BANK_TRANSFER" && (
                    <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-2.5 text-xs animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
                        <span className="text-[9px] font-black uppercase text-blue-800 tracking-wider">
                          Bank Transfer / NEFT / IMPS
                        </span>
                        <span className="text-[8px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                          Direct Settlement
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 block mb-1">Transfer Mode</label>
                          <select
                            value={transferMode}
                            onChange={(e) => setTransferMode(e.target.value)}
                            className="w-full text-xs font-bold p-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 shadow-2xs"
                          >
                            <option value="NEFT">NEFT Transfer</option>
                            <option value="IMPS">IMPS Instant</option>
                            <option value="RTGS">RTGS High-Value</option>
                            <option value="ONLINE">NetBanking / Gateway</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 block mb-1">Sender Bank Name</label>
                          <input
                            type="text"
                            placeholder="e.g. ICICI Bank"
                            value={chequeBank}
                            onChange={(e) => setChequeBank(e.target.value)}
                            className="w-full text-xs font-bold p-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 shadow-2xs"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[8px] font-bold text-slate-500 block">
                            UTR / Transaction Ref No.
                          </label>
                          <span className="text-[8px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded tracking-wider">
                            OPTIONAL
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Optional UTR reference number (leave blank if not available)..."
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          className="w-full text-xs font-bold p-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 shadow-2xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Cash tender & change */}
                  {payMethod === "CASH" && (() => {
                    const netPayable = selectedDueIds.reduce((sum, id) => sum + (payingState[id] ?? 0), 0);
                    const netPayableRupees = toRupees(netPayable);
                    const received = Number(amountReceived) || 0;
                    const changeDue = received > netPayableRupees ? toPaisa(received - netPayableRupees) : 0;

                    return (
                      <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-2 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            Cash Tender / Received
                          </label>
                          {netPayableRupees > 0 && (
                            <div className="flex items-center gap-1 text-[8px] font-black">
                              <button
                                type="button"
                                onClick={() => setAmountReceived(String(netPayableRupees))}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 cursor-pointer"
                              >
                                Exact ₹{netPayableRupees.toLocaleString("en-IN")}
                              </button>
                              {netPayableRupees < 2000 && (
                                <button
                                  type="button"
                                  onClick={() => setAmountReceived("2000")}
                                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                                >
                                  ₹2,000
                                </button>
                              )}
                              {netPayableRupees < 5000 && (
                                <button
                                  type="button"
                                  onClick={() => setAmountReceived("5000")}
                                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                                >
                                  ₹5,000
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 items-center">
                          <input
                            type="number"
                            placeholder="Enter cash given by parent..."
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            className="w-full text-xs font-bold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-indigo-650"
                          />
                          <div className="text-right">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                              Change Return
                            </span>
                            <span className="text-sm font-extrabold text-emerald-600 block leading-tight">
                              {formatP(changeDue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Optional Manual / Offline Book Receipt Number */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3 text-indigo-600" />
                        <span>Offline / Book Receipt No. (Optional)</span>
                      </label>
                      <span className="text-[8px] font-bold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
                        Register
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. BK-204 / 4591 (physical register receipt #)"
                      value={manualReceiptNo}
                      onChange={(e) => setManualReceiptNo(e.target.value)}
                      className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 placeholder:text-slate-400"
                    />
                    <p className="text-[8px] text-slate-400 font-medium leading-tight">
                      If physical paper receipt was issued, record its number here for cross-reference. System online
                      receipt will still be generated.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={selectedDueIds.length === 0 || isSubmittingPayment}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmittingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Generating Official Receipt...</span>
                      </>
                    ) : (
                      <span>
                        Generate Receipt & Record (
                        {formatP(selectedDueIds.reduce((sum, id) => sum + (payingState[id] ?? 0), 0))})
                      </span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}