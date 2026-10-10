"use client";

// ─────────────────────────────────────────────────────────────────────────────
// De-duplicated: the Fee Collection console is now a SINGLE shared component.
// This file previously held a byte-for-byte copy (~95KB) of the accountant
// version, which meant every fix had to be made twice. It now re-exports the
// shared component so there is exactly one source of truth.
//
// Admin keeps identical FULL access — no role restriction is introduced here.
// ─────────────────────────────────────────────────────────────────────────────
export { default } from "@/components/shared/FeeCollectTab";
