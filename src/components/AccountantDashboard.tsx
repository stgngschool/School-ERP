"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  CreditCard,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle,
  FileSpreadsheet,
  Users,
  Printer,
  PlusCircle,
  MessageSquare,
  Settings,
  Search,
  ArrowLeft,
  Coins,
  QrCode,
  Phone,
  Calendar,
  UserCheck,
  ChevronDown,
  ArrowRight,
  FileText,
  BookOpen,
  Hash,
  Home,
  Send,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";
import StudentProfileModal from "@/components/StudentProfileModal";
import MarksFeedingConsole from "@/components/MarksFeedingConsole";


// Groups multiple months or siblings into a single row if the list grows too long (> 4 items)
const getGroupedReceiptItems = (items: any[]) => {
  if (!items || items.length === 0) return [];
  if (items.length <= 4) return items;

  const groups: { [key: string]: { name: string; studentPrefix: string; baseFeeHead: string; months: string[]; amount: number; discount: number } } = {};

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
    const monthsList = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];

    if (rest.includes("-")) {
      const parts = rest.split("-");
      let monthPartIndex = -1;
      for (let i = parts.length - 1; i >= 0; i--) {
        const partLower = parts[i].toLowerCase();
        const hasMonth = monthsList.some((m) => partLower.includes(m));
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
      const matchedMonth = monthsList.find((m) => monthLower.includes(m));
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
      if (g.months.length >= 3) {
        finalName += ` (${g.months[0]} to ${g.months[g.months.length - 1]})`;
      } else {
        finalName += ` (${g.months.join(", ")})`;
      }
    }
    return {
      name: finalName,
      amount: g.amount,
      discount: g.discount,
    };
  });
};

export default function AccountantDashboard() {
  const {
    user,
    students,
    dueItems,
    receipts,
    ledgerEntries,
    feeHeads,
    feeStructures,
    schoolInfo,
    recordItemizedPayment,
    addFeeHead,
    addFeeStructure,
    activeTab,
    setActiveTab,
    classes,
  } = useAuth();

  const validTabs = ["collect", "defaulters", "structures", "ledger", "marks"];
  const currentTab = validTabs.includes(activeTab) ? activeTab : "collect";

  React.useEffect(() => {
    if (!validTabs.includes(activeTab)) {
      setActiveTab("collect");
    }
  }, [activeTab]);
  
  // Payment Form States
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedDueIds, setSelectedDueIds] = useState<string[]>([]);
  const [payMethod, setPayMethod] = useState("CASH");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [discountsState, setDiscountsState] = useState<Record<string, number>>({});
  const [payingState, setPayingState] = useState<Record<string, number>>({});
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [transactionRef, setTransactionRef] = useState("");
  const [activeSiblingTabId, setActiveSiblingTabId] = useState("");
  const [fifoAmount, setFifoAmount] = useState("");
  
  // Printable receipt overlay
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [receiptPageSize, setReceiptPageSize] = useState<"A4" | "A5">("A5");
  const [showProfileModal, setShowProfileModal] = useState(false);


  // Receipts/Ledger sub-tab and filter states
  const [ledgerSubTab, setLedgerSubTab] = useState<"receipts" | "raw">("receipts");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerDate, setLedgerDate] = useState("");

  // Defaulter / Dues Report filters
  const [defaulterSearch, setDefaulterSearch] = useState("");
  const [defaulterClass, setDefaulterClass] = useState("All");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [defaulterPage, setDefaulterPage] = useState(1);

  // Defaulter Alerts state
  const [alertSuccessMsg, setAlertSuccessMsg] = useState("");

  // Fee Config States
  const [newHead, setNewHead] = useState("");
  const [newStructName, setNewStructName] = useState("");
  const [newStructFreq, setNewStructFreq] = useState("monthly");
  const [newStructClass, setNewStructClass] = useState("All");
  const [structFeeInputs, setStructFeeInputs] = useState<Record<string, string>>({});
  const [structSuccess, setStructSuccess] = useState(false);

  // Student Search / Auto-suggest State
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filters students by dues > 0
  const unpaidStudents = students.filter((s) => {
    const sDues = dueItems.filter((d) => d.studentId === s.id && d.status === "UNPAID");
    return sDues.length > 0;
  });

  // Calculate matches for name, admission number, parent name, phone, or Family ID
  const suggestions = React.useMemo(() => {
    if (!students || students.length === 0) return [];
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      // Prioritize students with unpaid dues when search query is empty
      const studentsWithDues = students.filter((s) =>
        dueItems.some((d) => d.studentId === s.id && d.status === "UNPAID")
      );
      return (studentsWithDues.length > 0 ? studentsWithDues : students).slice(0, 8);
    }

    return students.filter((s) => {
      const name = s.name ? s.name.toLowerCase() : "";
      const adm = s.admissionNo ? s.admissionNo.toLowerCase() : "";
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
        parent.includes(query) ||
        father.includes(query) ||
        phone.includes(query) ||
        mobile.includes(query) ||
        family.includes(query) ||
        classSec.includes(query) ||
        classOnly === query
      );
    }).slice(0, 10);
  }, [searchQuery, students, dueItems]);

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSelectedDueIds([]);
    setDiscountsState({});
    setPayingState({});
    setAmountReceived("");
    setShowSuggestions(false);
  };

  const selectedStudentObj = students.find((s) => s.id === selectedStudentId);

  // Group siblings sharing the same Family ID
  const siblingStudents = React.useMemo(() => {
    if (!selectedStudentObj) return [];
    if (!selectedStudentObj.familyCode) return [selectedStudentObj];
    return students.filter(s => s.familyCode === selectedStudentObj.familyCode);
  }, [selectedStudentObj, students]);

  const siblingStudentIds = React.useMemo(() => {
    return siblingStudents.map(s => s.id);
  }, [siblingStudents]);

  const selectedStudentDues = React.useMemo(() => {
    return dueItems.filter(d => siblingStudentIds.includes(d.studentId) && d.status === "UNPAID");
  }, [siblingStudentIds, dueItems]);

  React.useEffect(() => {
    if (selectedStudentId) {
      setActiveSiblingTabId(selectedStudentId);
    }
  }, [selectedStudentId]);

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
        setDiscountsState((d) => ({ ...d, [dueId]: 0 }));
        setPayingState((p) => ({ ...p, [dueId]: due.amount }));
        return [...prev, dueId];
      }
    });
  };

  const handleFIFOAllocate = (amountStr: string) => {
    const totalAmountToAllocate = Number(amountStr) || 0;
    if (totalAmountToAllocate <= 0) {
      setSelectedDueIds([]);
      setPayingState({});
      setDiscountsState({});
      return;
    }

    // Sort all dues across siblings by due date (oldest first)
    const sortedDues = [...selectedStudentDues].sort((a, b) => {
      return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
    });

    let remaining = totalAmountToAllocate;
    const newSelectedIds: string[] = [];
    const newPayingState: Record<string, number> = {};
    const newDiscountsState: Record<string, number> = {};

    for (const due of sortedDues) {
      if (remaining <= 0) break;

      newSelectedIds.push(due.id);
      newDiscountsState[due.id] = 0; // Default discount is 0

      if (remaining >= due.amount) {
        newPayingState[due.id] = due.amount;
        remaining -= due.amount;
      } else {
        newPayingState[due.id] = remaining;
        remaining = 0;
      }
    }

    setSelectedDueIds(newSelectedIds);
    setPayingState(newPayingState);
    setDiscountsState(newDiscountsState);
  };

  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

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
        studentId: dueItems.find(d => d.id === dueId)?.studentId
      }));

      const totalPaid = items.reduce((sum, item) => sum + item.payAmount, 0);
      const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
      const originalDueSum = unpaidItems.reduce((sum, item) => sum + item.amount, 0);
      const remainingArrears = originalDueSum - totalPaid - totalDiscount;

      if (totalPaid <= 0 && totalDiscount <= 0) {
        setIsSubmittingPayment(false);
        return;
      }

      // Send null for studentId to trigger unified family checkout
      const success = await recordItemizedPayment(null, items, payMethod, transactionRef);
      if (!success) {
        alert("Payment failed. Please check backend logs or try again.");
        setIsSubmittingPayment(false);
        return;
      }

      // Calculate remaining arrears for the family
      const familyOtherDuesSum = dueItems
        .filter((d) => siblingStudentIds.includes(d.studentId) && d.status === "UNPAID" && !selectedDueIds.includes(d.id))
        .reduce((sum, item) => sum + item.amount, 0);

      const totalRemainingArrears = familyOtherDuesSum + remainingArrears;
      const isSingleSibling = siblingStudents.length === 1;

      // Receipt Details for modal
      const matchedReceipt = {
        receiptNo: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        studentName: isSingleSibling ? student.name : `Family (Siblings: ${siblingStudents.map(s => s.name).join(", ")})`,
        classSection: isSingleSibling ? `${student.class}-${student.section}` : "Unified Family",
        admissionNo: isSingleSibling ? student.admissionNo : student.familyCode || "Multi",
        amount: totalPaid,
        method: payMethod,
        discount: totalDiscount,
        arrears: totalRemainingArrears,
        details: items
          .map((i) => {
            const itemObj = unpaidItems.find((ui) => ui.id === i.ledgerEntryId);
            const itemDesc = itemObj?.name || "";
            const child = students.find(s => s.id === itemObj?.studentId);
            const prefix = child ? `${child.name}: ` : "";
            return `${prefix}${itemDesc} (Paid: Rs. ${i.payAmount}${i.discountAmount > 0 ? `, Disc: Rs. ${i.discountAmount}` : ""})`;
          })
          .join(" + "),
        items: items.map((i) => {
          const itemObj = unpaidItems.find((ui) => ui.id === i.ledgerEntryId);
          const itemDesc = itemObj?.name || "";
          const child = students.find(s => s.id === itemObj?.studentId);
          return {
            name: child ? `${child.name}: ${itemDesc}` : itemDesc,
            amount: i.payAmount,
            discount: i.discountAmount
          };
        }),
        createdAt: new Date().toISOString().split("T")[0],
      };

      setActiveReceipt(matchedReceipt);
      setSelectedDueIds([]);
      setDiscountsState({});
      setPayingState({});
      setAmountReceived("");
      setTransactionRef("");
      setSelectedStudentId("");
      setSearchQuery("");
      setShowReceiptModal(true);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleSendSMS = (studentName: string, parentName: string, amount: number) => {
    setAlertSuccessMsg(`SMS Mock Broadcast Sent: Parent ${parentName} notified about ${studentName}'s pending dues of Rs. ${amount.toLocaleString("en-IN")}.`);
    setTimeout(() => setAlertSuccessMsg(""), 4000);
  };

  const handleAddHead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHead) return;
    addFeeHead(newHead);
    setNewHead("");
  };

  const handleAddStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStructName) return;

    const itemsList: { headName: string; amount: number }[] = [];
    let total = 0;

    Object.keys(structFeeInputs).forEach((headName) => {
      const val = parseFloat(structFeeInputs[headName]) || 0;
      if (val > 0) {
        itemsList.push({ headName, amount: val });
        total += val;
      }
    });

    if (itemsList.length === 0) {
      alert("Please enter a value greater than 0 for at least one Fee Head.");
      return;
    }

    addFeeStructure(newStructName, newStructFreq, total, newStructClass, itemsList);
    setNewStructName("");
    setNewStructFreq("monthly");
    setNewStructClass("All");
    setStructFeeInputs({});
    setStructSuccess(true);
    setTimeout(() => setStructSuccess(false), 3000);
  };

  // Math Calculations for Accountant (Personalized)
  const myReceipts = receipts.filter((r) => r.createdById === user?.id);
  const myTotalCollections = myReceipts.reduce((sum, r) => sum + r.amount, 0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const myTodayReceipts = myReceipts.filter((r) => r.createdAt && r.createdAt.slice(0, 10) === todayStr);
  const myTodayCollections = myTodayReceipts.reduce((sum, r) => sum + r.amount, 0);

  const myCashTally = myReceipts.filter(r => r.method === "CASH").reduce((sum, r) => sum + r.amount, 0);
  const myUpiTally = myReceipts.filter(r => r.method === "UPI").reduce((sum, r) => sum + r.amount, 0);

  const paymentSubtotal = selectedStudentDues
    .filter((d) => selectedDueIds.includes(d.id))
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-4">
      {/* 1. Header & Quick Overview (Shown only on Dashboard tab to save vertical screen space) */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-1 border-b border-slate-200/80 pb-3">
          <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Accountant Billing Console</h2>
          <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
            Manage school ledgers, generate receipts, record payments, and track outstanding defaulters.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">My Daily Collection</span>
          <h3 className="text-lg font-black text-green-600 tracking-tight">
            Rs. {myTodayCollections.toLocaleString("en-IN")}
          </h3>
          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Today ({new Date().toLocaleDateString("en-IN")})</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">My Total Receipts</span>
          <h3 className="text-lg font-black text-indigo-600 tracking-tight">
            {myReceipts.length} Vouchers
          </h3>
          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Total count generated by me</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">My Counter Balance</span>
          <h3 className="text-lg font-black text-slate-700 tracking-tight">
            Rs. {myTotalCollections.toLocaleString("en-IN")}
          </h3>
          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Cash: Rs. {myCashTally.toLocaleString("en-IN")} | UPI: Rs. {myUpiTally.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Quick Action Stickers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Sticker 1: Collect Fee */}
        <button
          onClick={() => setActiveTab("collect")}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-0.5 hover:rotate-1 hover:border-indigo-300 transition-all duration-300 group cursor-pointer"
        >
          <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform">
            <CreditCard className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Collect Fee</span>
        </button>

        {/* Sticker 2: Manage Defaulters */}
        <button
          onClick={() => setActiveTab("defaulters")}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-0.5 hover:-rotate-1 hover:border-indigo-300 transition-all duration-300 group cursor-pointer"
        >
          <div className="h-10 w-10 bg-pink-50 rounded-full flex items-center justify-center text-pink-655 border border-pink-100 group-hover:scale-110 transition-transform">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Defaulters List</span>
        </button>

        {/* Sticker 3: Configure Fees */}
        <button
          onClick={() => setActiveTab("structures")}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-0.5 hover:rotate-1 hover:border-indigo-300 transition-all duration-300 group cursor-pointer"
        >
          <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-650 border border-emerald-100 group-hover:scale-110 transition-transform">
            <Settings className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Fee Structures</span>
        </button>

        {/* Sticker 4: Ledger Audit Logs */}
        <button
          onClick={() => setActiveTab("ledger")}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-0.5 hover:-rotate-1 hover:border-indigo-300 transition-all duration-300 group cursor-pointer"
        >
          <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-650 border border-amber-100 group-hover:scale-110 transition-transform">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Ledger Audit</span>
        </button>
      </div>

      {/* 3. Panel Body */}
      <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-sm">
        
        {/* TAB: Feed Student Marks */}
        {currentTab === "marks" && (
          <MarksFeedingConsole />
        )}

        {/* TAB 1: Collect Fee Form */}
        {currentTab === "collect" && (
          <div>
            {!selectedStudentId ? (
              // SEARCH VIEW (No student selected)
              <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
                <div className="inline-flex p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 shadow-[0_4px_12px_rgba(79,70,229,0.06)]">
                  <CreditCard className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Counter Fee Collection</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Search for a student by their Name, Admission Number, or Family Code to access their billing ledger.
                  </p>
                </div>
                
                {/* Search Input Container */}
                <div className="relative max-w-lg mx-auto">
                  <div className="relative shadow-sm rounded-xl border border-slate-200 bg-white p-1 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all duration-300">
                    <div className="flex items-center">
                      <Search className="h-4.5 w-4.5 text-slate-400 ml-3" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Type Student Name, Admission No, or Family ID..."
                        className="w-full text-xs font-semibold py-2.5 px-3 outline-none border-none bg-transparent text-slate-700 placeholder-slate-400"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedStudentId("");
                            setSelectedDueIds([]);
                            setDiscountsState({});
                            setPayingState({});
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 text-[10px] font-bold mr-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Suggestions dropdown inside search view */}
                  {showSuggestions && (
                    <>
                      <div 
                        className="fixed inset-0 z-10 cursor-default" 
                        onClick={() => setShowSuggestions(false)} 
                      />
                      <div className="absolute z-20 w-full bg-white border border-slate-200/80 rounded-xl mt-2 shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-200 text-left">
                        {!searchQuery.trim() && (
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Students Pending Dues (Click to Select)
                          </div>
                        )}
                        {suggestions.length > 0 ? (
                          suggestions.map((s) => {
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
                                className="w-full px-5 py-3 hover:bg-indigo-50/50 text-xs transition-colors flex justify-between items-center cursor-pointer group"
                              >
                                <div>
                                  <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                                    {s.name}
                                    {s.familyCode && (
                                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded border border-slate-200/60">
                                        Family: {s.familyCode}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] font-semibold text-slate-400 mt-1">
                                    Class: {s.class}-{s.section} | Adm: {s.admissionNo} | Parent: {s.parentName || s.fatherName || "N/A"}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                                    studentDueSum > 0 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-green-50 text-green-600 border border-green-100"
                                  }`}>
                                    Rs. {studentDueSum}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-6 text-center text-xs font-semibold text-slate-400">
                            No students found matching "{searchQuery}".
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-4 text-left">
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 h-fit border border-indigo-100/50">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Family Accounts</h4>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                        Selecting a student automatically bundles sibling dues. Issue a single combined receipt for parents.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 h-fit border border-emerald-100/50">
                      <Printer className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Print Vouchers</h4>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                        Record counter payments and print official receipts instantly. Shows discounts and remaining balances.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              // SELECTED STUDENT FLOW (Fees detail and Collect Fee)
              showProfileModal ? (
                <StudentProfileModal
                  studentId={selectedStudentId}
                  isOpen={true}
                  isInline={true}
                  onClose={() => setShowProfileModal(false)}
                />
              ) : (
                <div className="space-y-6">
                
                {/* 1. Header Student Panel Card */}
                <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Background decoration */}
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
                      onClick={() => setShowProfileModal(true)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-indigo-300 hover:text-white transition-colors cursor-pointer bg-slate-850/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-indigo-700/50 ml-2"
                    >
                      View Full Profile
                    </button>

                    
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-lg font-black tracking-tight">{selectedStudentObj?.name}</h3>
                      <span className="text-[9px] font-black uppercase bg-indigo-600/60 text-white px-2 py-0.5 rounded-full border border-indigo-500/50">
                        Class {selectedStudentObj?.class}-{selectedStudentObj?.section}
                      </span>
                      {selectedStudentObj?.familyCode && (
                        <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                          <Users className="h-3 w-3" /> Family Code: {selectedStudentObj?.familyCode}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 text-slate-300 text-[10px] font-semibold">
                      <p>Admission No: <span className="font-bold text-white">{selectedStudentObj?.admissionNo}</span></p>
                      <p>Parent Name: <span className="font-bold text-white">{selectedStudentObj?.parentName}</span></p>
                      <p>Parent Phone: <span className="font-bold text-white">{selectedStudentObj?.parentPhone}</span></p>
                      {siblingStudents.length > 1 && (
                        <p className="text-amber-400">
                          Siblings: <span className="font-bold">{siblingStudents.length} Children Linked</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-left lg:text-right space-y-1 shrink-0 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/30">
                    <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">Total Outstanding Dues</span>
                    <h3 className="text-xl font-black text-rose-400 tracking-tight">
                      Rs. {selectedStudentDues.reduce((sum, item) => sum + item.amount, 0).toLocaleString("en-IN")}
                    </h3>
                    <p className="text-[9px] text-slate-300 font-bold">{selectedStudentDues.length} Unpaid Invoices</p>
                  </div>
                </div>

                {/* 2. Main Ledger & Checkout Panel Grid */}
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
                            const childDues = selectedStudentDues.filter(d => d.studentId === child.id);
                            const childDueSum = childDues.reduce((sum, d) => sum + d.amount, 0);
                            const childSelectedCount = childDues.filter(d => selectedDueIds.includes(d.id)).length;
                            const isActive = (activeSiblingTabId || selectedStudentId) === child.id;
                            
                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => setActiveSiblingTabId(child.id)}
                                className={`px-3 py-2 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-center gap-3 shrink-0 ${
                                  isActive
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                    : "bg-white border-slate-200/80 text-slate-600 hover:border-slate-350 hover:bg-slate-50/50"
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-white animate-pulse" : "bg-indigo-500"}`} />
                                <div>
                                  <span className="block text-xs font-black tracking-tight leading-tight">{child.name}</span>
                                  <span className={`block text-[8px] mt-0.5 font-bold ${isActive ? "text-indigo-200" : "text-slate-400"}`}>
                                    Class {child.class}-{child.section} • {childDues.length} dues (₹{childDueSum.toLocaleString("en-IN")})
                                  </span>
                                </div>
                                {childSelectedCount > 0 && (
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                                    isActive ? "bg-white text-indigo-700 font-extrabold" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                  }`}>
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Outstanding Invoices</h4>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Select and configure the dues to collect now.</p>
                      </div>
                      
                      {selectedStudentDues.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = selectedStudentDues.map(d => d.id);
                              setSelectedDueIds(allIds);
                              const newD = { ...discountsState };
                              const newP = { ...payingState };
                              selectedStudentDues.forEach(due => {
                                newD[due.id] = 0;
                                newP[due.id] = due.amount;
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
                              const activeChildDues = selectedStudentDues.filter(d => d.studentId === activeChildId);
                              const activeChildIds = activeChildDues.map(d => d.id);
                              
                              setSelectedDueIds(prev => {
                                const next = [...prev];
                                activeChildIds.forEach(id => {
                                  if (!next.includes(id)) next.push(id);
                                });
                                return next;
                              });
                              
                              setDiscountsState(d => {
                                const next = { ...d };
                                activeChildDues.forEach(due => {
                                  next[due.id] = 0;
                                });
                                return next;
                              });
                              
                              setPayingState(p => {
                                const next = { ...p };
                                activeChildDues.forEach(due => {
                                  next[due.id] = due.amount;
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

                    {/* Focused Child Invoice List */}
                    <div>
                      {(() => {
                        const childId = activeSiblingTabId || selectedStudentId;
                        const child = siblingStudents.find(s => s.id === childId);
                        if (!child) return null;
                        const childDues = selectedStudentDues.filter(d => d.studentId === child.id);
                        
                        if (childDues.length === 0) {
                          return (
                            <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
                              <div>
                                <p className="text-xs font-black text-slate-800">All Fees Cleared</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">No outstanding invoices remain for {child.name}.</p>
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
                                return (
                                  <div
                                    key={due.id}
                                    className={`p-3.5 border rounded-xl text-xs space-y-3 transition-all duration-150 ${
                                      isChecked 
                                        ? "bg-indigo-50/10 border-indigo-200 shadow-sm" 
                                        : "bg-transparent border-transparent hover:border-slate-200"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleToggleDueSelection(due.id)}
                                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5 cursor-pointer"
                                        />
                                        <div>
                                          <div className="flex items-center flex-wrap gap-1.5">
                                            <span className="font-bold text-slate-800 text-xs">{due.name}</span>
                                            {due.totalPaid && due.totalPaid > 0 ? (
                                              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded leading-none">
                                                Partially Paid (₹{due.totalPaid} Paid)
                                              </span>
                                            ) : null}
                                          </div>
                                          <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                                            Due Date: {due.dueDate}
                                            {due.originalAmount && due.originalAmount !== due.amount ? ` | Original: ₹${due.originalAmount}` : ""}
                                          </span>
                                        </div>
                                      </label>
                                      <span className="font-black text-slate-800">₹{due.amount.toLocaleString("en-IN")}</span>
                                    </div>
                                    
                                    {isChecked && (
                                      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider animate-in fade-in duration-150">
                                        <div>
                                          <span className="block mb-1 text-slate-400">Discount (₹)</span>
                                          <input
                                            type="number"
                                            min="0"
                                            max={due.amount}
                                            value={discountsState[due.id] === undefined || discountsState[due.id] === 0 ? "" : discountsState[due.id]}
                                            placeholder="0"
                                            onChange={(e) => {
                                              const raw = e.target.value.replace(/^0+(?=\d)/, "");
                                              const disc = Math.max(0, Math.min(due.amount, Number(raw) || 0));
                                              setDiscountsState((d) => ({ ...d, [due.id]: raw === "" ? 0 : disc }));
                                              setPayingState((p) => ({ ...p, [due.id]: due.amount - (raw === "" ? 0 : disc) }));
                                            }}
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-500"
                                          />
                                        </div>
                                        <div>
                                          <span className="block mb-1 text-slate-400">Paying Amount (₹)</span>
                                          <div className="relative">
                                            <input
                                              type="number"
                                              min="0"
                                              max={due.amount - (discountsState[due.id] ?? 0)}
                                              value={payingState[due.id] === undefined ? due.amount : (payingState[due.id] === 0 && (discountsState[due.id] ?? 0) !== due.amount ? "" : payingState[due.id])}
                                              placeholder="0"
                                              onChange={(e) => {
                                                const raw = e.target.value.replace(/^0+(?=\d)/, "");
                                                const disc = discountsState[due.id] ?? 0;
                                                const maxPay = due.amount - disc;
                                                const payVal = Math.max(0, Math.min(maxPay, Number(raw) || 0));
                                                setPayingState((p) => ({ ...p, [due.id]: raw === "" ? 0 : payVal }));
                                              }}
                                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-500 pr-10"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const disc = discountsState[due.id] ?? 0;
                                                setPayingState(p => ({ ...p, [due.id]: due.amount - disc }));
                                              }}
                                              className="absolute right-1 top-1.5 bottom-1.5 px-1.5 bg-indigo-50 hover:bg-indigo-100 text-[8px] font-black text-indigo-700 rounded transition-colors cursor-pointer"
                                            >
                                              FULL
                                            </button>
                                          </div>
                                        </div>
                                        <div className="flex flex-col justify-end text-right">
                                          <span className="block text-slate-400 mb-1">Arrears Remaining</span>
                                          <span className="text-xs font-black text-rose-600 py-2">
                                            ₹{(due.amount - (discountsState[due.id] ?? 0) - (payingState[due.id] ?? due.amount)).toLocaleString("en-IN")}
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

                    {/* Sibling / Family Receipt Log */}
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Family Payment History</h4>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {receipts
                          .filter(r => siblingStudentIds.includes(r.studentId as string) || (r.studentIds && r.studentIds.some((id: string) => siblingStudentIds.includes(id))))
                          .map((rec) => (
                            <div
                              key={rec.id}
                              onClick={() => {
                                const std = students.find(s => s.id === rec.studentId);
                                setActiveReceipt({
                                  ...rec,
                                  admissionNo: std ? std.admissionNo : "Unified/Family",
                                  discount: 0,
                                  arrears: 0,
                                });
                                setShowReceiptModal(true);
                              }}
                              className="p-3 border border-slate-100 bg-slate-50/40 hover:bg-slate-100/60 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer transition-all hover:scale-[1.01] duration-150"
                            >
                              <div>
                                <p className="font-bold text-slate-800">{rec.studentName}</p>
                                <p className="text-[9px] text-slate-400 mt-0.5">Receipt: {rec.receiptNo} | {rec.createdAt}</p>
                                <p className="text-[8px] text-indigo-600 font-bold max-w-sm truncate mt-0.5">{rec.details}</p>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1 shrink-0">
                                <p className="font-extrabold text-slate-800">Rs. {rec.amount.toLocaleString("en-IN")}</p>
                                <span className="text-[8px] font-black uppercase bg-green-50 text-green-700 border border-green-100 px-1.5 py-0.5 rounded">
                                  {rec.method} Verified
                                </span>
                              </div>
                            </div>
                          ))}
                        
                        {receipts.filter(r => siblingStudentIds.includes(r.studentId as string) || (r.studentIds && r.studentIds.some((id: string) => siblingStudentIds.includes(id)))).length === 0 && (
                          <p className="text-[10px] text-slate-400 font-semibold italic text-center py-4 bg-slate-50/50 rounded-lg">
                            No receipts found for this family ledger.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Col: Checkout & Calculators Panel */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 space-y-4 shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
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
                          <div className="flex justify-between items-center py-3 text-xs font-semibold text-slate-500">
                            <span>Total Discount:</span>
                            <span className="font-extrabold text-green-600">
                              Rs. {selectedDueIds.reduce((sum, id) => sum + (discountsState[id] ?? 0), 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-3 text-xs font-bold text-slate-800">
                            <span>Net Payable Amount:</span>
                            <span className="text-sm font-black text-indigo-600">
                              Rs. {selectedDueIds.reduce((sum, id) => sum + (payingState[id] ?? 0), 0).toLocaleString("en-IN")}
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
                          const upiLink = `upi://pay?pa=${schoolInfo.upiId || "gngschool@icici"}&pn=${encodeURIComponent(schoolInfo.upiMerchantName || schoolInfo.name || "School Finance")}&am=${netPayable.toFixed(2)}&cu=INR&tn=${encodeURIComponent("School Fees")}`;
                          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiLink)}`;
                          return (
                            <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center gap-3 text-center animate-in slide-in-from-top-2 duration-200">
                              <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider block">
                                Scan UPI QR to Pay
                              </span>
                              <div className="relative p-2 bg-slate-50 rounded-xl border border-slate-200/50">
                                <img src={qrUrl} alt="UPI QR Code" className="w-36 h-36 mx-auto" />
                                <div className="absolute inset-x-2 top-2 h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-bounce" />
                              </div>
                              <p className="text-xs font-black text-indigo-600">
                                ₹{netPayable.toLocaleString("en-IN")}
                              </p>
                              <p className="text-[8px] text-slate-400 font-semibold leading-tight max-w-[185px] mx-auto">
                                Scan using GPay, PhonePe, Paytm, or any UPI app. Amount is pre-filled.
                              </p>

                              
                              <div className="w-full space-y-1 text-left">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                  UPI Transaction Ref ID (UTR)
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={transactionRef}
                                  onChange={(e) => setTransactionRef(e.target.value)}
                                  placeholder="Enter 12-digit UPI Ref/UTR No..."
                                  className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-650 focus:ring-1 focus:ring-indigo-100"
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Cheque / Bank Transfer Reference No Input */}
                        {(payMethod === "CHEQUE" || payMethod === "BANK_TRANSFER") && (
                          <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                              Transaction reference / Cheque No
                            </label>
                            <input
                              type="text"
                              required
                              value={transactionRef}
                              onChange={(e) => setTransactionRef(e.target.value)}
                              placeholder="e.g. TXN98765432, CHQ-201..."
                              className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-650 focus:ring-1 focus:ring-indigo-100"
                            />
                          </div>
                        )}

                        {/* Cash return helper (Only relevant for Cash Counter) */}
                        {payMethod === "CASH" && (
                          <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100 animate-in slide-in-from-top-2 duration-200">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Cash Received
                              </label>
                              <input
                                type="number"
                                placeholder="Amount received..."
                                value={amountReceived}
                                onChange={(e) => setAmountReceived(e.target.value)}
                                className="w-full text-xs font-bold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-indigo-650"
                              />
                            </div>
                            <div className="text-right flex flex-col justify-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                Change Due
                              </span>
                              <span className="text-sm font-extrabold text-indigo-600 block mt-0.5">
                                Rs. {(() => {
                                  const netPayable = selectedDueIds.reduce((sum, id) => sum + (payingState[id] ?? 0), 0);
                                  const received = Number(amountReceived) || 0;
                                  return received > netPayable ? (received - netPayable).toLocaleString("en-IN") : 0;
                                })()}
                              </span>
                            </div>
                          </div>
                        )}

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
                            <span>Generate Receipt & Record (Rs. {selectedDueIds.reduce((sum, id) => sum + (payingState[id] ?? 0), 0).toLocaleString("en-IN")})</span>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>

                </div>

              </div>
            )
          )}
          </div>
        )}

        {/* TAB 2: Defaulter / Outstanding Dues Report */}
        {currentTab === "defaulters" && (
          <div className="space-y-5">
            {alertSuccessMsg && (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 p-2.5 rounded-xl border border-green-100 text-xs font-semibold animate-fade-in">
                <CheckCircle className="h-4 w-4" />
                {alertSuccessMsg}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Dues & Defaulters Report
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Click on any student card to view detailed fee breakdown.
                </p>
              </div>
              <button 
                onClick={() => alert(`Exporting XLS report...`)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl py-2 px-3 text-[10px] font-bold text-slate-600 self-start sm:self-auto cursor-pointer transition-all"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Export XLS
              </button>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Search by Student Name or Parent..."
                value={defaulterSearch}
                onChange={(e) => { setDefaulterSearch(e.target.value); setExpandedStudentId(null); setDefaulterPage(1); }}
                className="w-full text-xs font-semibold py-2.5 pl-3 pr-8 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all placeholder-slate-400"
              />
              <select
                value={defaulterClass}
                onChange={(e) => { setDefaulterClass(e.target.value); setExpandedStudentId(null); setDefaulterPage(1); }}
                className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all text-slate-600"
              >
                <option value="All">All Classes (Outstanding)</option>
                {Array.from(new Set(students.map(s => `${s.class}-${s.section}`))).filter(Boolean).sort().map((cls) => (
                  <option key={cls} value={cls}>Class {cls}</option>
                ))}
              </select>
            </div>

            {/* Card Grid */}
            {(() => {
              // Pre-group due items by student id to optimize rendering speed from O(N * M) to O(N + M)
              const studentDuesMap = new Map<string, typeof dueItems>();
              const unpaidDuesMap = new Map<string, typeof dueItems>();
              const paidDuesMap = new Map<string, typeof dueItems>();

              for (const d of dueItems) {
                const sid = d.studentId;
                if (!studentDuesMap.has(sid)) studentDuesMap.set(sid, []);
                studentDuesMap.get(sid)!.push(d);

                if (d.status === "UNPAID") {
                  if (!unpaidDuesMap.has(sid)) unpaidDuesMap.set(sid, []);
                  unpaidDuesMap.get(sid)!.push(d);
                } else if (d.status === "PAID") {
                  if (!paidDuesMap.has(sid)) paidDuesMap.set(sid, []);
                  paidDuesMap.get(sid)!.push(d);
                }
              }

              const filteredDefaulters = students.filter((s) => {
                const unpaidDues = unpaidDuesMap.get(s.id) || [];
                if (unpaidDues.length === 0) return false;
                const matchesSearch = !defaulterSearch.trim() ||
                  s.name.toLowerCase().includes(defaulterSearch.toLowerCase()) ||
                  s.parentName.toLowerCase().includes(defaulterSearch.toLowerCase());
                const sClassVal = `${s.class}-${s.section}`;
                const matchesClass = defaulterClass === "All" || sClassVal === defaulterClass;
                return matchesSearch && matchesClass;
              });

              const totalOutstanding = filteredDefaulters.reduce((sum, s) => {
                const unpaidDues = unpaidDuesMap.get(s.id) || [];
                return sum + unpaidDues.reduce((a, d) => a + d.amount, 0);
              }, 0);

              if (filteredDefaulters.length === 0) {
                return (
                  <div className="text-center py-12 text-slate-400 text-xs font-semibold italic">
                    No defaulters found matching filters. 🎉
                  </div>
                );
              }

              // If a student's statement is opened, render the detailed page view
              if (expandedStudentId) {
                const std = filteredDefaulters.find((s) => s.id === expandedStudentId) || students.find((s) => s.id === expandedStudentId);
                if (std) {
                  const allDues    = studentDuesMap.get(std.id) || [];
                  const unpaidDues = unpaidDuesMap.get(std.id) || [];
                  const paidDues   = paidDuesMap.get(std.id) || [];
                  const totalFee   = allDues.reduce((s, d) => s + d.amount, 0);
                  const totalPaid  = paidDues.reduce((s, d) => s + d.amount, 0);
                  const totalDue   = unpaidDues.reduce((s, d) => s + d.amount, 0);

                  return (
                    <div className="space-y-5 animate-fade-in bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                      {/* Back navigation */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <button
                          onClick={() => setExpandedStudentId(null)}
                          className="flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer group"
                        >
                          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Dues Report
                        </button>
                        <span className="text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1 rounded-full">
                          Outstanding Dues: ₹{totalDue.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* Student Profile Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 border border-slate-100/80 rounded-2xl p-5">
                        <div className="flex items-center gap-4">
                          {std.photoUrl ? (
                            <img src={std.photoUrl} alt={std.name} className="h-16 w-16 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0" />
                          ) : (
                            <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xl uppercase shadow-inner shrink-0">
                              {std.name.substring(0, 2)}
                            </div>
                          )}
                          <div>
                            <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">Student Profile</span>
                            <h4 className="text-lg font-black text-slate-900 mt-0.5 tracking-tight uppercase">{std.name}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-xs font-bold text-slate-500">
                              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-slate-400" /> ADM: {std.admissionNo}</span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5 text-slate-400" /> Class: {std.class} - {std.section}</span>
                              {std.rollNo && (
                                <>
                                  <span className="text-slate-300">&bull;</span>
                                  <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5 text-slate-400" /> Roll: {std.rollNo}</span>
                                </>
                              )}
                              {std.familyCode && (
                                <>
                                  <span className="text-slate-300">&bull;</span>
                                  <span className="flex items-center gap-1"><Home className="h-3.5 w-3.5 text-slate-400" /> Fam Code: {std.familyCode}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="sm:border-l sm:border-slate-200/80 sm:pl-6 space-y-1.5 shrink-0">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <span className="text-slate-400 flex items-center justify-center"><UserCheck className="h-4 w-4" /></span>
                            <span>{std.fatherName || std.parentName}</span>
                          </div>
                          { (std.fatherMobile || std.parentPhone) && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                              <span className="text-slate-400 flex items-center justify-center"><Phone className="h-4 w-4" /></span>
                              <span>{std.fatherMobile || std.parentPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Financial Overview Metrics */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                          <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Total Fees Allocated</span>
                            <span className="text-base font-black text-slate-800 mt-0.5 block">₹{totalFee.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                        <div className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                          <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest block">Total Fees Paid</span>
                            <span className="text-base font-black text-emerald-600 mt-0.5 block">₹{totalPaid.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                        <div className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                          <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shadow-sm shrink-0">
                            <AlertCircle className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-rose-500 tracking-widest block">Total Outstanding Dues</span>
                            <span className="text-base font-black text-rose-600 mt-0.5 block">₹{totalDue.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Statement Title & Table */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white mt-2">
                        <div className="bg-slate-50 border-b border-slate-100 px-5 py-3.5 flex justify-between items-center">
                          <h5 className="text-xs font-black uppercase text-slate-700 tracking-wider">Fee Transaction Ledger / Statement</h5>
                          <span className="text-[10px] font-bold text-slate-400">{allDues.length} entries</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                                <th className="py-3 px-5">Due Date</th>
                                <th className="py-3 px-5">Fee Details</th>
                                <th className="py-3 px-5 text-right">Amount</th>
                                <th className="py-3 px-5 text-right text-amber-600">Concession</th>
                                <th className="py-3 px-5 text-right text-emerald-600">Paid</th>
                                <th className="py-3 px-5 text-right text-rose-600">Due</th>
                                <th className="py-3 px-5 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                              {allDues.map((d) => (
                                <tr key={d.id} className={`${d.status === "UNPAID" ? "bg-rose-50/10" : ""} hover:bg-slate-50/40 transition-colors`}>
                                  <td className="py-3 px-5 text-slate-400 font-bold whitespace-nowrap">{d.dueDate || "—"}</td>
                                  <td className="py-3 px-5 font-bold text-slate-800">{d.name}</td>
                                  <td className="py-3 px-5 text-right text-slate-700">₹{d.amount.toLocaleString("en-IN")}</td>
                                  <td className="py-3 px-5 text-right text-amber-500 font-bold">₹0.00</td>
                                  <td className="py-3 px-5 text-right text-emerald-600 font-black">
                                    {d.status === "PAID" ? `₹${d.amount.toLocaleString("en-IN")}` : "₹0.00"}
                                  </td>
                                  <td className="py-3 px-5 text-right text-rose-600 font-black">
                                    {d.status === "UNPAID" ? `₹${d.amount.toLocaleString("en-IN")}` : "₹0.00"}
                                  </td>
                                  <td className="py-3 px-5 text-center">
                                    <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                      d.status === "PAID"
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                        : "bg-rose-50 border-rose-200 text-rose-700"
                                    }`}>
                                      {d.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs font-black">
                                <td colSpan={2} className="py-3.5 px-5 text-right text-slate-500 uppercase tracking-wider">Grand Total</td>
                                <td className="py-3.5 px-5 text-right text-slate-800">₹{totalFee.toLocaleString("en-IN")}</td>
                                <td className="py-3.5 px-5 text-right text-amber-500">₹0.00</td>
                                <td className="py-3.5 px-5 text-right text-emerald-600">₹{totalPaid.toLocaleString("en-IN")}</td>
                                <td className="py-3.5 px-5 text-right text-rose-600">₹{totalDue.toLocaleString("en-IN")}</td>
                                <td className="py-3.5 px-5"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex-wrap">
                          <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm"
                          >
                            <Printer className="h-4 w-4 text-slate-500" /> Print Statement
                          </button>
                          <button
                            onClick={() => handleSendSMS(std.name, std.parentName, totalDue)}
                            className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all cursor-pointer shadow-sm"
                          >
                            <Send className="h-4 w-4 text-emerald-600" /> Send Reminder
                          </button>
                          <button
                            onClick={() => { setSelectedStudentId(std.id); setActiveTab("collect"); }}
                            className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                          >
                            <CreditCard className="h-4 w-4" /> Collect Fee
                          </button>
                          <button
                            onClick={() => alert("Exporting statement...")}
                            className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer shadow-sm"
                          >
                            <Download className="h-4 w-4 text-slate-500" /> Export CSV
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              }

              const ITEMS_PER_PAGE = 12;
              const totalPages = Math.ceil(filteredDefaulters.length / ITEMS_PER_PAGE) || 1;
              const activePage = Math.min(defaulterPage, totalPages);
              const paginatedDefaulters = filteredDefaulters.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);

              return (
                <div className="space-y-4">
                  {/* Top Stats Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Total Students", value: students.length, color: "text-slate-800" },
                      { label: "With Outstanding Due", value: filteredDefaulters.length, color: "text-rose-600" },
                      { label: "Fully Cleared", value: students.length - filteredDefaulters.length, color: "text-emerald-600" },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-white border border-slate-200/70 rounded-xl px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block">{stat.label}</span>
                        <span className={`text-base font-black mt-0.5 block ${stat.color}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Student Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedDefaulters.map((std) => {
                      const allDues    = studentDuesMap.get(std.id) || [];
                      const unpaidDues = unpaidDuesMap.get(std.id) || [];
                      const paidDues   = paidDuesMap.get(std.id) || [];
                      const totalFee   = allDues.reduce((s, d) => s + d.amount, 0);
                      const totalPaid  = paidDues.reduce((s, d) => s + d.amount, 0);
                      const totalDue   = unpaidDues.reduce((s, d) => s + d.amount, 0);

                      return (
                        <div
                          key={std.id}
                          onClick={() => setExpandedStudentId(std.id)}
                          className="bg-white rounded-2xl border transition-all duration-200 overflow-hidden border-slate-200 hover:border-indigo-400 hover:shadow-[0_4px_20px_rgba(99,102,241,0.08)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer group flex flex-col justify-between"
                        >
                          {/* Card Body */}
                          <div className="px-4 pt-4 pb-3">
                            {/* Name Row */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-3">
                                {std.photoUrl ? (
                                  <img src={std.photoUrl} alt={std.name} className="h-9 w-9 rounded-xl object-cover border border-slate-200 shrink-0" />
                                ) : (
                                  <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                                    {std.name.substring(0, 2)}
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-tight group-hover:text-indigo-600 transition-colors truncate max-w-[200px]">
                                    {std.name}
                                  </h4>
                                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-semibold flex-wrap">
                                    <span className="flex items-center gap-1 whitespace-nowrap"><Users className="h-3 w-3 text-slate-400 shrink-0" /> ADM: {std.admissionNo}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="flex items-center gap-1 whitespace-nowrap"><FileText className="h-3 w-3 text-slate-400 shrink-0" /> {allDues.length} fee records</span>
                                    {std.familyCode && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <span className="flex items-center gap-1 whitespace-nowrap"><Home className="h-3 w-3 text-slate-400 shrink-0" /> {std.familyCode}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="shrink-0 text-[8px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full mt-0.5">
                                DUE
                              </span>
                            </div>

                            {/* Class / Roll No Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block">Class</span>
                                <span className="text-sm font-black text-slate-800 mt-0.5 block">{std.class} - {std.section}</span>
                              </div>
                              <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block">Roll No.</span>
                                <span className="text-sm font-black text-slate-800 mt-0.5 block">{std.rollNo || "—"}</span>
                              </div>
                            </div>

                            {/* Parent Info */}
                            <div className="space-y-1 mb-3">
                              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600 truncate">
                                <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{std.fatherName || std.parentName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 truncate">
                                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{std.fatherMobile || std.parentPhone}</span>
                              </div>
                            </div>

                            {/* Financial Strip */}
                            <div className="grid grid-cols-3 border border-slate-100 rounded-xl overflow-hidden">
                              <div className="px-2 py-2 text-center border-r border-slate-100">
                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Total Fee</span>
                                <span className="text-[11px] font-black text-slate-800 mt-0.5 block whitespace-nowrap">₹{totalFee.toLocaleString("en-IN")}</span>
                              </div>
                              <div className="px-2 py-2 text-center border-r border-slate-100">
                                <span className="text-[8px] font-black uppercase text-emerald-500 tracking-wider block">Paid</span>
                                <span className="text-[11px] font-black text-emerald-600 mt-0.5 block whitespace-nowrap">₹{totalPaid.toLocaleString("en-IN")}</span>
                              </div>
                              <div className="px-2 py-2 text-center">
                                <span className="text-[8px] font-black uppercase text-rose-500 tracking-wider block">Due</span>
                                <span className="text-[11px] font-black text-rose-600 mt-0.5 block whitespace-nowrap">₹{totalDue.toLocaleString("en-IN")}</span>
                              </div>
                            </div>
                          </div>

                          {/* View Full Statement CTA */}
                          <div className="w-full flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/20 group-hover:bg-indigo-50/30 transition-colors">
                            <span className="text-[10px] font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                                View Full Statement
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-indigo-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-4 mt-4 text-xs font-bold text-slate-500 select-none">
                      <button
                        disabled={activePage === 1}
                        onClick={() => { setDefaulterPage(activePage - 1); setExpandedStudentId(null); }}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
                      >
                        Previous
                      </button>
                      <span>
                        Page {activePage} of {totalPages}
                      </span>
                      <button
                        disabled={activePage === totalPages}
                        onClick={() => { setDefaulterPage(activePage + 1); setExpandedStudentId(null); }}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: Fee Structures & Fee Heads Config */}
        {currentTab === "structures" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configure Fee Heads */}
            <div className="space-y-4 border-r border-slate-200/80 pr-0 lg:pr-6">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Configure School Fee Heads
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Create base ledger fee categories (e.g. Library Fees, Sports Fees).
                </p>
              </div>

              <form onSubmit={handleAddHead} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newHead}
                  onChange={(e) => setNewHead(e.target.value)}
                  placeholder="e.g. Annual Exams Fee..."
                  className="flex-1 text-xs font-semibold py-1.5 px-3 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-indigo-600"
                />
                <button
                  type="submit"
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <PlusCircle className="h-4 w-4" /> Add Head
                </button>
              </form>

              <div className="flex flex-wrap gap-2 pt-2">
                {feeHeads.map((head, index) => (
                  <span
                    key={index}
                    className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md"
                  >
                    {head.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Configure Fee Structures */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Create Fee Invoices Structure
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Bundle heads into a billing template.
                </p>
              </div>

              {structSuccess && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 p-2.5 rounded border border-green-100 text-[11px] font-semibold">
                  <CheckCircle className="h-4 w-4" /> Fee structure added successfully!
                </div>
              )}

              <form onSubmit={handleAddStructure} className="space-y-3 bg-slate-50/40 p-4 border border-slate-200/60 rounded-xl">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Structure Name</label>
                    <input
                      type="text"
                      required
                      value={newStructName}
                      onChange={(e) => setNewStructName(e.target.value)}
                      placeholder="e.g. Class 10 Standard..."
                      className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Class</label>
                    <select
                      value={newStructClass}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewStructClass(val);
                        if (!newStructName || newStructName.startsWith("Class ")) {
                          setNewStructName(`Class ${val} Standard Fees`);
                        }
                      }}
                      className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600 shadow-sm"
                    >
                      <option value="All">All Classes (Fallback)</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.name}>
                          Class {cls.name} &mdash; {cls.section}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Charge Frequency</label>
                    <select
                      value={newStructFreq}
                      onChange={(e) => setNewStructFreq(e.target.value)}
                      className="w-full text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none bg-white focus:border-indigo-600 shadow-sm"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                      <option value="exam">Exam</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Amount (Rs.)</label>
                    <div className="w-full text-xs font-black py-2 px-2.5 bg-slate-100 border border-slate-200 rounded-lg text-indigo-700 select-none">
                      Rs. {Object.values(structFeeInputs).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Itemized Fee Heads Input Grid */}
                <div className="space-y-2 border-t border-slate-200/80 pt-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Itemized Fee Heads</span>
                  {feeHeads.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-semibold italic">Please create Fee Types on the left side first.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                      {feeHeads.map((head) => (
                        <div key={head.name} className="flex flex-col gap-1 p-2 bg-white border border-slate-200/80 rounded-lg shadow-sm">
                          <label className="text-[9px] font-black text-slate-500 truncate uppercase">{head.name}</label>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-bold text-slate-400">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={structFeeInputs[head.name] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setStructFeeInputs((prev) => ({ ...prev, [head.name]: val }));
                              }}
                              className="w-full text-xs font-bold p-1 border border-slate-200/60 rounded focus:outline-none focus:border-indigo-650"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer">
                  Save Structure Template
                </button>
              </form>

              {/* List of structures */}
              <div className="space-y-2 pt-3 border-t border-slate-200/80">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Available Structures</p>
                <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {feeStructures.map((struct, idx) => (
                    <div key={idx} className="p-3 border border-slate-200/80 rounded-xl bg-slate-50/40 hover:bg-slate-50 transition-all text-xs font-semibold flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-slate-800 font-bold text-xs">{struct.name}</p>
                          <div className="flex gap-1.5 mt-0.5">
                            <span className="text-[8px] font-black uppercase bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded leading-none">
                              {struct.frequency}
                            </span>
                            <span className="text-[8px] font-black uppercase bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded leading-none">
                              Class: {struct.className || "All"}
                            </span>
                          </div>
                        </div>
                        <span className="text-indigo-600 font-black text-xs">Rs. {struct.total.toLocaleString("en-IN")}</span>
                      </div>
                      
                      {struct.items && struct.items.length > 0 && (
                        <div className="bg-white/80 border border-slate-100/50 rounded-lg p-2 divide-y divide-slate-100/80">
                          {struct.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex justify-between items-center py-1 text-[10px] text-slate-500 font-medium first:pt-0 last:pb-0">
                              <span>{item.headName}</span>
                              <span className="font-bold text-slate-700">Rs. {item.amount.toLocaleString("en-IN")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Ledger Logs */}
        {currentTab === "ledger" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Receipts & Audit Ledger Book
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Track and reprint all invoices, or audit raw double-entry transactions ledger.
                </p>
              </div>

              {/* Sub-tab toggle buttons */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl self-start sm:self-auto select-none shrink-0 border border-slate-200/40">
                <button
                  onClick={() => setLedgerSubTab("receipts")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    ledgerSubTab === "receipts"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Receipt Vouchers
                </button>
                <button
                  onClick={() => setLedgerSubTab("raw")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    ledgerSubTab === "raw"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Double-Entry Ledger
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by Name, Receipt #, or Desc..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full text-xs font-semibold py-2.5 pl-3 pr-8 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all placeholder-slate-400"
                />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <input
                  type="date"
                  value={ledgerDate}
                  onChange={(e) => setLedgerDate(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 transition-all text-slate-705"
                />
              </div>

              {/* Clear Filters Button */}
              {(ledgerSearch || ledgerDate) && (
                <button
                  onClick={() => {
                    setLedgerSearch("");
                    setLedgerDate("");
                  }}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all self-stretch cursor-pointer border border-slate-200/50"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Receipts Book Sub-Tab */}
            {ledgerSubTab === "receipts" && (
              <div className="space-y-4">
                {/* Aggregate Summary Box */}
                {(() => {
                  const filtered = receipts.filter((r) => {
                    const createdByMe = r.createdById === user?.id;
                    const matchesSearch =
                      !ledgerSearch.trim() ||
                      r.receiptNo?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                      r.studentName?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                      r.details?.toLowerCase().includes(ledgerSearch.toLowerCase());
                    const matchesDate = !ledgerDate || r.createdAt === ledgerDate;
                    return createdByMe && matchesSearch && matchesDate;
                  });

                  const totalAmt = filtered.reduce((sum, r) => sum + r.amount, 0);
                  const cashAmt = filtered.filter(r => r.method === "CASH").reduce((sum, r) => sum + r.amount, 0);
                  const upiAmt = filtered.filter(r => r.method === "UPI").reduce((sum, r) => sum + r.amount, 0);
                  const bankAmt = filtered.filter(r => r.method === "ONLINE" || r.method === "CHEQUE").reduce((sum, r) => sum + r.amount, 0);

                  return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.015)]">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Total Receipts</span>
                        <span className="text-sm font-black text-slate-800 mt-1 block">{filtered.length} Vouchers</span>
                      </div>
                      <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.015)]">
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block">Total Collection</span>
                        <span className="text-sm font-black text-slate-900 mt-1 block">₹{totalAmt.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.015)]">
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest block">Cash Collection</span>
                        <span className="text-sm font-black text-emerald-700 mt-1 block">₹{cashAmt.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.015)]">
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block">UPI & Digital</span>
                        <span className="text-sm font-black text-blue-700 mt-1 block">₹{(upiAmt + bankAmt).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Receipts Vouchers Table */}
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.015)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-200 text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                          <th className="py-3 px-4">Receipt No</th>
                          <th className="py-3 px-4">Student & Class</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Mode</th>
                          <th className="py-3 px-4 text-right">Amount</th>
                          <th className="py-3 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {(() => {
                          const filtered = receipts.filter((r) => {
                            const createdByMe = r.createdById === user?.id;
                            const matchesSearch =
                              !ledgerSearch.trim() ||
                              r.receiptNo?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                              r.studentName?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                              r.details?.toLowerCase().includes(ledgerSearch.toLowerCase());
                            const matchesDate = !ledgerDate || r.createdAt === ledgerDate;
                            return createdByMe && matchesSearch && matchesDate;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-[11px] text-slate-400 font-semibold italic bg-slate-50/30">
                                  No receipts found matching filters.
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="py-3.5 px-4 font-black text-indigo-700">{rec.receiptNo}</td>
                              <td className="py-3.5 px-4">
                                <p className="font-extrabold text-slate-900">{rec.studentName}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{rec.classSection}</p>
                              </td>
                              <td className="py-3.5 px-4 max-w-xs truncate text-[10px] text-slate-500 font-medium">
                                {rec.details}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 text-[10px] font-bold">{rec.createdAt}</td>
                              <td className="py-3.5 px-4">
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                  rec.method === "CASH"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-blue-50 text-blue-700 border-blue-100"
                                }`}>
                                  {rec.method}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right font-black text-slate-950">
                                ₹{rec.amount.toLocaleString("en-IN")}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => {
                                    const std = students.find((s) => s.id === rec.studentId);
                                    setActiveReceipt({
                                      ...rec,
                                      admissionNo: std ? std.admissionNo : "Unified/Family",
                                      discount: 0,
                                      arrears: 0,
                                    });
                                    setShowReceiptModal(true);
                                  }}
                                  className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-all cursor-pointer"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Double-Entry Ledger Sub-Tab */}
            {ledgerSubTab === "raw" && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-2xl flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>Double-Entry Records Logs</span>
                  <span>Total {ledgerEntries.length} items logged</span>
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {(() => {
                    const filtered = ledgerEntries.filter((log) => {
                      const createdByMe = log.createdById === user?.id;
                      const student = students.find((s) => s.id === log.studentId);
                      const matchesSearch =
                        !ledgerSearch.trim() ||
                        student?.name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                        log.description.toLowerCase().includes(ledgerSearch.toLowerCase());
                      const matchesDate = !ledgerDate || log.createdAt === ledgerDate;
                      return createdByMe && matchesSearch && matchesDate;
                    });

                    if (filtered.length === 0) {
                      return (
                        <p className="text-[10px] text-slate-400 font-semibold italic text-center py-6 bg-slate-50/50 rounded-lg">
                          No ledger items found matching filters.
                        </p>
                      );
                    }

                    return filtered.map((log) => {
                      const isCharge = log.type === "CHARGE" || log.type === "FINE";
                      const student = students.find((s) => s.id === log.studentId);
                      return (
                        <div
                          key={log.id}
                          className="p-3 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs font-semibold"
                        >
                          <div>
                            <p className="font-black text-slate-800">
                              {student?.name || "Student"} ({student?.class}-{student?.section})
                            </p>
                            <p className="text-slate-500 font-semibold text-[10px] mt-0.5">{log.description}</p>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">{log.createdAt}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] font-black ${isCharge ? "text-rose-600" : "text-emerald-600"}`}>
                              {isCharge ? "+" : "-"} ₹{log.amount.toLocaleString("en-IN")}
                            </span>
                            <span
                              className={`block text-[7px] font-black uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded border self-end ${
                                isCharge
                                  ? "bg-rose-50 border-rose-100 text-rose-800"
                                  : "bg-green-50 border-green-100 text-green-800"
                              }`}
                            >
                              {log.type}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <StudentProfileModal
        studentId={selectedStudentId}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* 4. Printable Invoice Receipt Modal (Accountant copy) */}

      {showReceiptModal && activeReceipt && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`bg-white border border-slate-200 rounded-2xl w-full p-6 shadow-2xl relative space-y-4 transition-all ${
            receiptPageSize === "A5" ? "max-w-md" : "max-w-2xl"
          }`}>
            
            {/* Page Size Selector */}
            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs font-bold text-slate-500 gap-2 shrink-0">
              <span>Print Page Layout:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setReceiptPageSize("A5")}
                  className={`py-1 px-3 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${
                    receiptPageSize === "A5"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/15"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-650"
                  }`}
                >
                  📄 A5 Compact
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptPageSize("A4")}
                  className={`py-1 px-3 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${
                    receiptPageSize === "A4"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/15"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-650"
                  }`}
                >
                  📄 A4 Standard
                </button>
              </div>
            </div>

            {/* Print Styling Override */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                #receipt-print-area, #receipt-print-area * {
                  visibility: visible;
                }
                #receipt-print-area {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: 100% !important;
                  box-sizing: border-box;
                  padding: ${receiptPageSize === "A5" ? "8mm" : "15mm"} !important;
                  margin: 0 !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                }
                @page {
                  size: ${receiptPageSize === "A5" ? "A5 portrait" : "A4 portrait"};
                  margin: 0;
                }
              }
            `}} />
            
            <div
              id="receipt-print-area"
              className={`border-2 rounded-2xl bg-white text-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all ${
                receiptPageSize === "A5"
                  ? "border-slate-200 p-4 space-y-3 text-[9px]"
                  : "border-slate-300 p-8 space-y-6 text-sm"
              } ${
                (() => {
                  const text = (activeReceipt.details || activeReceipt.remarks || "").toLowerCase();
                  const months = ["april", "may", "june", "july", "august", "september", "october", "november", "december", "january", "february", "march"];
                  let isAnnual = text.includes("full year") || text.includes("annual") || text.includes("1 year") || text.includes("12 months");
                  if (activeReceipt.items) {
                    const itemTexts = activeReceipt.items.map((i: any) => (i.name || i.description || "").toLowerCase()).join(" ");
                    const matches = months.filter(m => itemTexts.includes(m) || text.includes(m));
                    if (matches.length >= 10) isAnnual = true;
                  }
                  return isAnnual ? "border-amber-400 bg-amber-50/10 shadow-md shadow-amber-500/5" : "";
                })()
              }`}
            >
              {/* Annual Clearance Banner */}
              {(() => {
                const text = (activeReceipt.details || activeReceipt.remarks || "").toLowerCase();
                const months = ["april", "may", "june", "july", "august", "september", "october", "november", "december", "january", "february", "march"];
                let isAnnual = text.includes("full year") || text.includes("annual") || text.includes("1 year") || text.includes("12 months");
                if (activeReceipt.items) {
                  const itemTexts = activeReceipt.items.map((i: any) => (i.name || i.description || "").toLowerCase()).join(" ");
                  const matches = months.filter(m => itemTexts.includes(m) || text.includes(m));
                  if (matches.length >= 10) isAnnual = true;
                }
                return isAnnual ? (
                  <div className={`bg-amber-500/10 border border-amber-300 text-amber-700 font-black uppercase py-1 px-2.5 rounded-lg flex items-center justify-center gap-1.5 shrink-0 select-none ${
                    receiptPageSize === "A5" ? "text-[10px]" : "text-sm py-2"
                  }`}>
                    🏆 ★ FULL YEAR ANNUAL CLEARANCE VOUCHER ★ 🏆
                  </div>
                ) : null;
              })()}

              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="School Logo" className={`rounded-full object-contain border border-slate-100 bg-white ${
                    receiptPageSize === "A5" ? "h-8 w-8" : "h-12 w-12"
                  }`} />
                  <div className="space-y-0.5">
                    <h4 className={`font-black text-indigo-700 uppercase tracking-tight leading-tight ${
                      receiptPageSize === "A5" ? "text-sm" : "text-xl"
                    }`}>{schoolInfo.name}</h4>
                    <p className={`text-slate-500 font-semibold leading-tight ${
                      receiptPageSize === "A5" ? "text-[8px] max-w-[280px]" : "text-xs max-w-[450px]"
                    }`}>{schoolInfo.address}</p>
                    <p className={`text-slate-400 font-bold ${
                      receiptPageSize === "A5" ? "text-[8px]" : "text-xs"
                    }`}>Phone: {schoolInfo.phone} | Email: {schoolInfo.email}</p>
                  </div>
                </div>
                <div className="text-right space-y-0.5 shrink-0">
                  <span className={`bg-indigo-50 border border-indigo-100 text-indigo-700 font-black uppercase rounded-md tracking-wider ${
                    receiptPageSize === "A5" ? "text-[8px] px-2 py-0.5" : "text-xs px-3.5 py-1"
                  }`}>
                    Official Fee Receipt
                  </span>
                  <p className={`text-slate-500 font-bold mt-1 ${
                    receiptPageSize === "A5" ? "text-[9px]" : "text-xs"
                  }`}>No: <span className="font-extrabold text-slate-900">{activeReceipt.receiptNo}</span></p>
                  <p className={`text-slate-400 font-bold ${
                    receiptPageSize === "A5" ? "text-[8px]" : "text-xs"
                  }`}>Date: <span className="font-extrabold text-slate-850">{activeReceipt.createdAt}</span></p>
                </div>
              </div>

              {/* Student Metadata Card */}
              <div className={`grid grid-cols-2 bg-slate-50/70 border border-slate-100/80 rounded-xl gap-x-4 ${
                receiptPageSize === "A5" ? "text-[9px] p-2.5 gap-y-1.5" : "text-xs p-4 gap-y-2.5"
              }`}>
                <div className="space-y-0.5">
                  <p className="text-slate-400 font-bold">Student Name:</p>
                  <p className={`font-extrabold text-slate-900 truncate leading-tight ${
                    receiptPageSize === "A5" ? "text-xs" : "text-sm"
                  }`}>{activeReceipt.studentName}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-slate-400 font-bold">Class / Section:</p>
                  <p className={`font-extrabold text-slate-900 truncate leading-tight ${
                    receiptPageSize === "A5" ? "text-xs" : "text-sm"
                  }`}>{activeReceipt.classSection}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-400 font-bold">Admission / Family ID:</p>
                  <p className={`font-extrabold text-slate-900 leading-tight ${
                    receiptPageSize === "A5" ? "" : "text-sm"
                  }`}>{activeReceipt.admissionNo || activeReceipt.admissionId || "Multi-Child / Family"}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-slate-400 font-bold">Payment Method:</p>
                  <p className={`font-extrabold text-slate-900 uppercase leading-tight ${
                    receiptPageSize === "A5" ? "" : "text-sm"
                  }`}>{activeReceipt.method} Counter</p>
                </div>
              </div>

              {/* Itemized Table */}
              {(() => {
                const groupedItems = getGroupedReceiptItems(activeReceipt.items || []);
                const hasDiscounts = groupedItems.some((i: any) => i.discount > 0);
                
                return (
                  <div className="space-y-1.5">
                    <p className={`font-black uppercase text-slate-400 tracking-wider ${
                      receiptPageSize === "A5" ? "text-[8px]" : "text-[10px]"
                    }`}>Receipt Breakdown</p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 ${
                            receiptPageSize === "A5" ? "text-[8px]" : "text-xs"
                          }`}>
                            <th className={receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}>Description</th>
                            {hasDiscounts && (
                              <th className={`text-right ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>Discount</th>
                            )}
                            <th className={`text-right ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>Paid Amount</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y divide-slate-100 font-semibold text-slate-700 ${
                          receiptPageSize === "A5" ? "text-[9px]" : "text-xs"
                        }`}>
                          {groupedItems.length > 0 ? (
                            groupedItems.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/20">
                                <td className={`max-w-[200px] truncate ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>{item.name || item.description}</td>
                                {hasDiscounts && (
                                  <td className={`text-right text-indigo-650 font-bold ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>
                                    {item.discount > 0 ? `₹${item.discount}` : "-"}
                                  </td>
                                )}
                                <td className={`text-right text-slate-900 font-extrabold ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>
                                  ₹{item.amount.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))
                          ) : (
                            // Fallback parsing if items array is empty
                            <tr>
                              <td className={`max-w-[200px] truncate ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>{activeReceipt.details}</td>
                              <td className={`text-right text-slate-900 font-extrabold ${receiptPageSize === "A5" ? "py-1.5 px-3" : "py-3 px-4"}`}>
                                  ₹{activeReceipt.amount.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Financial Summary Box */}
              <div className="flex justify-end pt-0.5">
                <div className={`font-bold text-slate-500 bg-slate-50/40 border border-slate-100 rounded-xl ${
                  receiptPageSize === "A5" ? "w-56 p-2.5 space-y-1 text-[9px]" : "w-80 p-4 space-y-2 text-xs"
                }`}>
                  <div className="flex justify-between items-center">
                    <span>Subtotal:</span>
                    <span className="text-slate-800">₹{activeReceipt.amount.toLocaleString("en-IN")}</span>
                  </div>
                  {activeReceipt.discount > 0 && (
                    <div className="flex justify-between items-center text-indigo-600">
                      <span>Discount:</span>
                      <span className="font-extrabold">₹{activeReceipt.discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {activeReceipt.arrears > 0 && (
                    <div className="flex justify-between items-center text-rose-600">
                      <span>Remaining Arrears:</span>
                      <span className="font-extrabold">₹{activeReceipt.arrears.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className={`border-t border-slate-200 pt-1.5 flex justify-between items-center text-emerald-700 font-black ${
                    receiptPageSize === "A5" ? "text-xs" : "text-sm"
                  }`}>
                    <span>Total Paid:</span>
                    <span>₹{activeReceipt.amount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Signatures & Computer generated text */}
              <div className="flex justify-between items-end pt-3">
                <div className={`text-slate-400 leading-tight italic ${
                  receiptPageSize === "A5" ? "text-[7px] max-w-[200px]" : "text-[10px] max-w-[320px]"
                }`}>
                  * Note: This is an officially verified computer-generated fee receipt. No physical signature is required.
                </div>
                <div className="text-center w-28 shrink-0">
                  <div className="h-6 w-full flex items-center justify-center">
                    <span className={`font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded rotate-[-2deg] ${
                      receiptPageSize === "A5" ? "text-[7px]" : "text-[10px]"
                    }`}>
                      SYSTEM VERIFIED
                    </span>
                  </div>
                  <p className={`text-slate-400 font-bold border-t border-slate-200 pt-0.5 mt-0.5 ${
                    receiptPageSize === "A5" ? "text-[8px]" : "text-xs"
                  }`}>
                    Authorized Cashier
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Voucher
              </button>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setActiveReceipt(null);
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
              >
                Dismiss Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
