const fs = require('fs');
const file = 'src/components/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Make Students list edge-to-edge on mobile and remove squished card look
// Target: <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
content = content.replace(
  '<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">',
  '<div className="bg-white sm:border sm:border-slate-200 sm:rounded-2xl overflow-hidden sm:shadow-sm -mx-3 sm:mx-0 border-y border-slate-200 sm:border-y-0">'
);

// Fix 2: Improve the Mobile Pagination UI
// Target: {Array.from({ length: totalPages }).map((_, i) => { ... })}
// We will completely replace the pagination block to use Next/Prev on mobile and full numbers on desktop.

const paginationTarget = `{/* PAGINATION CONTROLS */}
                        {totalPages > 1 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm mt-3 text-xs font-bold text-slate-500 gap-3">
                            <div>
                              Showing <span className="text-slate-800 font-extrabold">{startIndex + 1}</span> to{" "}
                              <span className="text-slate-800 font-extrabold">
                                {Math.min(startIndex + itemsPerPage, totalItems)}
                              </span>{" "}
                              of <span className="text-slate-855 font-black">{totalItems}</span> students
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              {Array.from({ length: totalPages }).map((_, i) => {
                                const pageNum = i + 1;
                                return (
                                  <button
                                    key={pageNum}
                                    type="button"
                                    onClick={() => {
                                      setCurrentPage(pageNum);
                                    }}
                                    className={\`h-7 w-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer \${
                                      activePage === pageNum
                                        ? "bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-md shadow-indigo-500/10"
                                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                                    }\`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}`;

const paginationFix = `{/* PAGINATION CONTROLS */}
                        {totalPages > 1 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between bg-white border-y sm:border border-slate-200 p-3 sm:p-4 -mx-3 sm:mx-0 sm:rounded-2xl sm:shadow-sm mt-3 text-xs font-bold text-slate-500 gap-4">
                            
                            {/* Mobile Pagination */}
                            <div className="flex sm:hidden w-full items-center justify-between">
                              <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={activePage === 1}
                                className="px-4 py-2 bg-slate-100 active:bg-slate-200 text-slate-700 rounded-xl disabled:opacity-50 font-black flex items-center gap-1"
                              >
                                ← Prev
                              </button>
                              <div className="flex flex-col items-center">
                                <span className="text-slate-800 font-black text-sm">Page {activePage}</span>
                                <span className="text-[9px] text-slate-400">of {totalPages} ({totalItems} total)</span>
                              </div>
                              <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={activePage === totalPages}
                                className="px-4 py-2 bg-indigo-600 active:bg-indigo-700 text-white rounded-xl disabled:opacity-50 font-black flex items-center gap-1"
                              >
                                Next →
                              </button>
                            </div>

                            {/* Desktop Pagination */}
                            <div className="hidden sm:block">
                              Showing <span className="text-slate-800 font-extrabold">{startIndex + 1}</span> to{" "}
                              <span className="text-slate-800 font-extrabold">
                                {Math.min(startIndex + itemsPerPage, totalItems)}
                              </span>{" "}
                              of <span className="text-slate-855 font-black">{totalItems}</span> students
                            </div>
                            <div className="hidden sm:flex gap-1 flex-wrap">
                              {Array.from({ length: totalPages }).map((_, i) => {
                                const pageNum = i + 1;
                                // Simple truncation for desktop if more than 10 pages
                                if (totalPages > 10 && pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - activePage) > 2) {
                                  if (pageNum === 2 || pageNum === totalPages - 1) return <span key={pageNum} className="px-1 py-1">...</span>;
                                  return null;
                                }
                                return (
                                  <button
                                    key={pageNum}
                                    type="button"
                                    onClick={() => {
                                      setCurrentPage(pageNum);
                                    }}
                                    className={\`h-8 w-8 flex items-center justify-center rounded-lg border transition-all cursor-pointer \${
                                      activePage === pageNum
                                        ? "bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-md shadow-indigo-500/10"
                                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                                    }\`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}`;

if (content.includes(paginationTarget)) {
  content = content.replace(paginationTarget, paginationFix);
  console.log("Pagination replaced successfully!");
} else {
  console.log("Could not find pagination target!");
  
  // Let's try a softer replace if whitespace mismatch
  const targetLines = paginationTarget.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
  const contentLines = content.split('\\n');
  
  let matchIdx = -1;
  for(let i=0; i<contentLines.length; i++) {
    if (contentLines[i].includes('PAGINATION CONTROLS')) {
      matchIdx = i;
      break;
    }
  }
  
  if (matchIdx !== -1) {
    let endIdx = -1;
    let braceCount = 0;
    for(let i=matchIdx+1; i<contentLines.length; i++) {
      braceCount += (contentLines[i].match(/\\{/g) || []).length;
      braceCount -= (contentLines[i].match(/\\}/g) || []).length;
      if (contentLines[i].includes('</>') || (braceCount <= 0 && contentLines[i].includes(')}'))) {
        endIdx = i;
        break;
      }
    }
    console.log("Found pagination block from", matchIdx, "to", endIdx);
  }
}

// Fix 3: Items per page on mobile - increase to 15 to reduce massive white gap while keeping egress low
content = content.replace(
  'const handleResize = () => setItemsPerPage(window.innerWidth < 768 ? 10 : 50);',
  'const handleResize = () => setItemsPerPage(window.innerWidth < 768 ? 20 : 50);'
);

fs.writeFileSync(file, content, 'utf8');
console.log("UI fixes applied.");
