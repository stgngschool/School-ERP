const fs = require('fs');
const file = 'src/components/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Pagination
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
                                className="px-4 py-2 bg-slate-100 active:bg-slate-200 text-slate-700 rounded-xl disabled:opacity-50 font-black flex items-center gap-1 transition-all"
                              >
                                ← Prev
                              </button>
                              <div className="flex flex-col items-center">
                                <span className="text-slate-800 font-black text-sm">Page {activePage}</span>
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">of {totalPages}</span>
                              </div>
                              <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={activePage === totalPages}
                                className="px-4 py-2 bg-indigo-600 active:bg-indigo-700 text-white rounded-xl disabled:opacity-50 font-black flex items-center gap-1 transition-all shadow-md shadow-indigo-600/20"
                              >
                                Next →
                              </button>
                            </div>

                            {/* Desktop Pagination Text */}
                            <div className="hidden sm:block">
                              Showing <span className="text-slate-800 font-extrabold">{startIndex + 1}</span> to{" "}
                              <span className="text-slate-800 font-extrabold">
                                {Math.min(startIndex + itemsPerPage, totalItems)}
                              </span>{" "}
                              of <span className="text-slate-855 font-black">{totalItems}</span> students
                            </div>
                            
                            {/* Desktop Pagination Buttons */}
                            <div className="hidden sm:flex gap-1 flex-wrap">
                              {Array.from({ length: totalPages }).map((_, i) => {
                                const pageNum = i + 1;
                                // Simple truncation logic for desktop if many pages
                                if (totalPages > 10 && pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - activePage) > 2) {
                                  if (pageNum === 2 || pageNum === totalPages - 1) return <span key={pageNum} className="px-1 py-1 text-slate-400">...</span>;
                                  return null;
                                }
                                return (
                                  <button
                                    key={pageNum}
                                    type="button"
                                    onClick={() => setCurrentPage(pageNum)}
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
  console.log("Pagination replaced successfully.");
} else {
  console.log("Pagination block not found exactly.");
}

// Fix 2: Edge-to-edge list wrapper (Targeting exactly the Students table wrapper)
const studentTableWrapperTarget = `                    return (
                      <>
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

                          {/* ── MOBILE: Select All Bar ── */}`;

const studentTableWrapperFix = `                    return (
                      <>
                        <div className="bg-white border-y sm:border sm:border-slate-200 sm:rounded-2xl overflow-hidden shadow-sm -mx-3 sm:mx-0">

                          {/* ── MOBILE: Select All Bar ── */}`;

if (content.includes(studentTableWrapperTarget)) {
  content = content.replace(studentTableWrapperTarget, studentTableWrapperFix);
  console.log("Students wrapper replaced successfully.");
} else {
  console.log("Students wrapper not found exactly.");
}

// Fix 3: Increase mobile items to 15 to reduce massive white gap at the bottom
const itemsPerPageTarget = 'const handleResize = () => setItemsPerPage(window.innerWidth < 768 ? 10 : 50);';
const itemsPerPageFix = 'const handleResize = () => setItemsPerPage(window.innerWidth < 768 ? 15 : 50);';
if (content.includes(itemsPerPageTarget)) {
  content = content.replace(itemsPerPageTarget, itemsPerPageFix);
  console.log("Items per page updated.");
}

fs.writeFileSync(file, content, 'utf8');
console.log("Done updating AdminDashboard.tsx");
