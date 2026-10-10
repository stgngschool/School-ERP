"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED Fee Collection console — used by BOTH Admin and Accountant dashboards.
// Both roles get identical FULL access (fee collection, discounts, student
// actions). No role-based restriction is applied here.
//
// This barrel keeps a SINGLE source of truth so any fix (e.g. UPI handling) is
// applied in exactly one place instead of two duplicated ~95KB copies.
// ─────────────────────────────────────────────────────────────────────────────
export { default } from "@/components/accountant/FeeCollectTab";
