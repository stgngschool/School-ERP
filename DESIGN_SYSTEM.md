# DESIGN SYSTEM: Premium Light-Theme Glassy Capsule Minimalism

This document defines the visual guidelines and UI styling tokens utilized for the School ERP application redesign. Use this file as a rulebook for styling dashboard elements, forms, tables, modals, and navigation tabs.

---

## 1. Design Philosophy: "Glassy Capsule Minimalism"
This theme emphasizes clean surfaces, soft light-gray borders, highly defined card roundings (`rounded-3xl`), small uppercase labels with high character tracking, and smooth interactive scale triggers. Rather than high-contrast shadow blocks or dark gradient panels, this style uses clean light-slate layers, subtle capsule sub-tabs, and accent indicators.

---

## 2. Design Tokens

### Color Palette
*   **Base Canvas**: `bg-slate-50/50` or `bg-slate-100/30`
*   **Card Backgrounds**: `bg-white/95 backdrop-blur-xs` or pure `bg-white`
*   **Borders**: Soft Slate borders (`border-slate-200/60` or `border-slate-100/80`)
*   **Primary Text**: Slate Dark (`text-slate-800` for bold titles, `text-slate-700` for body font)
*   **Muted Text/Labels**: Slate Muted (`text-slate-400` or `text-slate-500`)
*   **Accent Channels**:
    *   *Indigo (General/Metrics)*: Accent `indigo-600`, Active background `bg-indigo-50`, Hover state `hover:bg-indigo-700`
    *   *Emerald (Registration/Active)*: Accent `emerald-600`, Active background `bg-emerald-50`, Hover state `hover:bg-emerald-700`
    *   *Rose (Exams/Alerts)*: Accent `rose-600`, Active background `bg-rose-50`, Hover state `hover:bg-rose-700`
    *   *Amber (Sync/CSV)*: Accent `amber-600`, Active background `bg-amber-50`, Hover state `hover:bg-amber-700`

### Shadows
*   **Cards & Panels**: Subtle elevation shadow: `shadow-[0_8px_30px_rgba(0,0,0,0.015)]`
*   **Inputs & Controls**: Inner-style flat shadow: `shadow-2xs`
*   **Dropdown Actions Menu**: Float shadow: `shadow-[0_8px_30px_rgba(0,0,0,0.02)]`
*   **Active Button Accents**: Soft glow: `shadow-[0_4px_12px_rgba(79,70,229,0.15)]`

### Curves & Roundings
*   **Containers & Modals**: Large curves (`rounded-3xl`)
*   **Filters, Tab Groups & Rows**: Medium curves (`rounded-2xl` or `rounded-xl`)
*   **Badges & Action Buttons**: Capsule curves (`rounded-xl` or `rounded-full`)

---

## 3. UI Component Templates

### A. Card Wrapper
```tsx
<div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
  {/* Content goes here */}
</div>
```

### B. Small Section Header Badge
```tsx
<div>
  <h3 className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 tracking-wider">
    <Icon className="h-3.5 w-3.5" /> Component Title
  </h3>
  <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
    Helper explanation text goes here
  </p>
</div>
```

### C. Text Inputs & Selection Filters
```tsx
<div>
  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5 tracking-wider">
    Input Field Name
  </label>
  <select
    className="w-full text-[11px] font-extrabold py-2.5 px-3 border border-slate-200/60 rounded-2xl outline-none bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
  >
    <option>Select Option</option>
  </select>
</div>
```

### D. Sub-tab Capsule Buttons
```tsx
<div className="flex flex-wrap gap-2 pb-3 border-b border-slate-200/60">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveSubTab(tab.id)}
      className={`flex items-center gap-1.5 px-4 py-2 border rounded-2xl text-xs font-black transition-all cursor-pointer ${
        activeSubTab === tab.id
          ? "bg-indigo-50 border-indigo-150 text-indigo-700 shadow-2xs"
          : "bg-white border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {tab.label}
    </button>
  ))}
</div>
```

### E. Modal Wrapper Dialog
```tsx
<div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
  <div className="bg-white border border-slate-200/60 rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.015)] relative space-y-5 text-left animate-scale-in">
    {/* Modal Header */}
    <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
      {/* Title */}
      <button 
        onClick={() => setOpen(false)} 
        className="h-8 w-8 bg-slate-50 border border-slate-200/60 text-slate-500 rounded-xl hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
    {/* Body & Form */}
  </div>
</div>
```
