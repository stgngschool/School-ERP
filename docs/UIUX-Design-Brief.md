# UI/UX Design Brief & Mobile Architecture
## Project: School Finance OS

---

## 1. Design Philosophy: "Tactile, Dense & Floating"

School Finance OS serves operators in demanding, fast-paced school counter environments. Staff work simultaneously on budget desktop PCs and mid-range Android mobile devices under fluctuating ambient lighting.

The user interface follows three core tenets:
1. **Desktop Density, Mobile Ergonomics**: Dense, high-information controls on desktop (`>= 768px`) with zero unnecessary whitespace; spacious, touch-friendly floating cards on mobile (`< 768px`).
2. **Floating Depth over Heavy Borders**: On mobile, content surfaces float effortlessly over `bg-slate-50` with subtle elevation (`shadow-sm` or `shadow-[0_4px_20px_rgba(0,0,0,0.03)]`) and `border-0 sm:border`.
3. **Full-Bleed Horizontal Swipes**: Navigation pills and filter strips bleed edge-to-edge off screen (`-mx-3 px-3`), inviting natural finger gestures.

---

## 2. Color Palette & Semantics

| Palette Token | Hex / Class | Semantic Meaning |
| :--- | :--- | :--- |
| **Brand Primary** | `indigo-600` / `indigo-50` | Primary actions, session badges, counter active state |
| **Cash & Success** | `emerald-600` / `emerald-50` | Cash payments, completed receipts, present attendance |
| **Dues & Critical** | `rose-600` / `rose-50` | Overdue balances, absent students, locked notices |
| **Alert & Circulars**| `amber-500` / `amber-50` | Roll call pending, circulars, draft restored warnings |
| **Neutral Surface** | `bg-slate-50` / `bg-white` | Page canvas, floating cards, table alternate rows |
| **Border Neutral**  | `border-slate-200/80` | Clean desktop separators and light mobile boundaries |

---

## 3. Mandatory Mobile UI Rules

### Rule 1: The Floating Card Standard
```tsx
// ✅ Correct: Floating card on mobile, bordered on desktop
<div className="bg-white rounded-2xl sm:rounded-3xl border-0 sm:border border-slate-200/60 p-3.5 sm:p-6 shadow-sm hover:shadow-md transition-all">
  ...
</div>

// ❌ Incorrect: Hardcoded bulky border that looks flat and boxed-in on phone
<div className="bg-white rounded-3xl border border-slate-300 p-6 shadow-none">
  ...
</div>
```

### Rule 2: Full-Bleed Action Strips
Horizontal navigation strips and action button groups on mobile must bleed past the screen's edge padding (`-mx-3 px-3`):
```tsx
<div className="-mx-3 px-3 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none no-scrollbar">
  <button className="shrink-0 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-bold shadow-xs">
    ...
  </button>
  {/* Trailing spacer ensures last item doesn't cut off on screen bevel */}
  <div className="w-2 shrink-0 sm:hidden" />
</div>
```

### Rule 3: Sticky Floating Bar Sync
Floating save and confirmation bars must respect native mobile bottom navigation heights:
```css
/* Always use CSS variable alignment */
bottom: calc(var(--bottom-nav-height, 64px) + var(--safe-bottom, 0px));
```
Never use arbitrary hardcoded values like `bottom-14` (56px) which collide with the `64px` bottom nav.

### Rule 4: Symmetrical 2x2 Metric Grids
Mobile metric overview cards must be structured as symmetrical 2-column grids (`grid-cols-2 gap-2.5 sm:gap-6`):
- Avoid stacking 4 full-width giant cards that occupy multiple scroll screens.
- Avoid 3-column squishing on small mobile viewports.

---

## 4. Typography & Indian Currency Formatting

- **Financial Figures**: Always emphasize amounts with bold tabular numbers (`font-black tracking-tight`).
- **Privacy Masking**: Respect Global Privacy Mode (`isCardMasked(key)`):
  - When active, format figures as `₹••••••` or `₹••••` to protect confidential collections from walk-in parent visibility.
- **Labels**: Micro-badges use uppercase bold tracking (`text-[9px] font-black uppercase tracking-wider`).
