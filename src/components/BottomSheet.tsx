"use client";

import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      setDragY(0);
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200); // matches the slide-down animation time (200ms)
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    // Let the exit animation finish before calling onClose to update parent state
    const timer = setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    draggingRef.current = false;
    const scrollTop = sheetRef.current?.scrollTop || 0;
    // Only allow swipe-to-dismiss if scrolled to the absolute top of the container
    if (scrollTop > 0) return;

    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    currentYRef.current = touch.clientY;
    draggingRef.current = true;
    setIsDragging(true);
  };

  // ── H-08 fix: block background page scroll / pull-to-refresh during a downward
  // swipe using a NON-passive native touchmove listener, which lets us call
  // preventDefault() safely. React's synthetic onTouchMove is registered as a
  // passive listener and cannot block scrolling (hence the earlier broken swipe).
  useEffect(() => {
    const el = sheetRef.current;
    if (!el || !shouldRender) return;

    const onMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      const touch = e.touches[0];
      currentYRef.current = touch.clientY;
      const deltaY = currentYRef.current - startYRef.current;
      if (deltaY > 0) {
        if (e.cancelable) e.preventDefault();
        setDragY(deltaY);
      }
    };

    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, [shouldRender]);

  const handleTouchEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);

    // If swiped down past 120px, close it. Otherwise, snap back up.
    if (dragY > 120) {
      handleClose();
    } else {
      setDragY(0);
    }
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Background Overlay */}
      <div
        className={`bottom-sheet-overlay md:hidden ${isClosing ? "closing" : ""}`}
        onClick={handleClose}
        style={{
          opacity: isClosing
            ? 0
            : dragY > 0
              ? Math.max(0, 1 - dragY / 300)
              : undefined,
          transition: isDragging ? "none" : "opacity 0.2s ease",
        }}
      />

      {/* Slide-up Container */}
      <div
        ref={sheetRef}
        className={`bottom-sheet md:hidden ${isClosing ? "closing" : ""}`}
        style={{
          transform: isClosing
            ? "translateY(100%)"
            : dragY > 0
              ? `translateY(${dragY}px)`
              : undefined,
          transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Visual Grab Handle for Swiping */}
        <div className="bottom-sheet-handle cursor-grab active:cursor-grabbing" style={{ touchAction: "none" }} />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 select-none">
          {typeof title === "string" ? (
            <h3 className="text-sm font-black text-slate-800">{title}</h3>
          ) : (
            title
          )}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all focus:outline-none"
            aria-label="Close sheet"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {children}
        </div>
      </div>
    </>
  );
}
