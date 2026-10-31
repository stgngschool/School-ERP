"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface StudentStatusRequest {
  ids: string | string[];
  name: string;
  status: "SUSPENDED" | "LEFT";
}

interface Props {
  request: StudentStatusRequest;
  onConfirm: () => Promise<{ success: boolean; error?: string } | void>;
  onClose: () => void;
}

export default function StudentStatusConfirmation({ request, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const leaving = request.status === "LEFT";

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const confirm = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await onConfirm();
      if (result?.success === false) {
        setError(result.error || "Status could not be updated. Please try again.");
      } else {
        onClose();
      }
    } catch {
      setError("Status could not be updated. Please try again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId}
      aria-busy={pending} onCancel={(event) => { event.preventDefault(); if (!pendingRef.current) onClose(); }}
      style={{ margin: "auto", width: "min(28rem, calc(100% - 2rem))", maxHeight: "calc(100dvh - 2rem)", overflowY: "auto", padding: "1.5rem", border: "1px solid #e2e8f0", borderRadius: "1.5rem", color: "#1e293b", background: "#fff", boxShadow: "0 24px 64px rgba(15,23,42,.2)" }}>
      <h2 id={titleId} style={{ fontSize: "1rem", fontWeight: 800, marginBottom: ".75rem" }}>
        {leaving ? "Mark as Left (TC)?" : "Suspend student?"}
      </h2>
      <p id={descriptionId} style={{ fontSize: ".875rem", lineHeight: 1.6, overflowWrap: "anywhere" }}>
        {leaving ? `Mark ${request.name} as Left (TC Issued)? Future billing charges will stop.` : `Suspend ${request.name}? You can activate the student again from the directory.`}
      </p>
      {error && <p role="alert" style={{ color: "#be123c", fontSize: ".875rem", marginTop: "1rem" }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: ".75rem", marginTop: "1.5rem" }}>
        <button type="button" autoFocus disabled={pending} onClick={onClose}
          style={{ padding: ".625rem 1rem", border: "1px solid #cbd5e1", borderRadius: ".75rem", fontWeight: 700, fontSize: ".875rem", opacity: pending ? .6 : 1 }}>Cancel</button>
        <button type="button" disabled={pending} onClick={confirm}
          style={{ padding: ".625rem 1rem", border: 0, borderRadius: ".75rem", fontWeight: 700, fontSize: ".875rem", color: "#fff", background: leaving ? "#be123c" : "#92400e", opacity: pending ? .6 : 1 }}>
          {pending ? "Updating…" : leaving ? "Mark as Left" : "Suspend"}
        </button>
      </div>
    </dialog>
  );
}
