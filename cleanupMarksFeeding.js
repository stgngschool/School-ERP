const fs = require('fs');

const file = 'src/components/MarksFeedingConsole.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove states
content = content.replace(
  /const \[showReportCardModal, setShowReportCardModal\] = useState\(false\);\s*const \[selectedReportCardStudentId, setSelectedReportCardStudentId\] = useState\(""\);\s*const \[selectedReportCardExam, setSelectedReportCardExam\] = useState\("All"\);\s*const \[isBulkPrintMode, setIsBulkPrintMode\] = useState\(false\);/,
  ''
);

// 2. Remove buttons in header
content = content.replace(
  /<div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">[\s\S]*?<\/div>\s*<\/div>\s*{\/\* Filters Grid \*\/}/,
  '</div>\n\n        {/* Filters Grid */}'
);

// 3. Remove Marksheet headers
content = content.replace(/<th className="py-3 px-3 text-center w-28">Marksheet<\/th>/g, '');

// 4. Remove Marksheet cells in the table body (2 instances)
content = content.replace(
  /<td className="py-3 px-3 text-center">\s*<button[\s\S]*?<Eye className="h-3 w-3" \/> Marksheet\s*<\/button>\s*<\/td>/g,
  ''
);

// 5. Remove the modal at the bottom (everything from {showReportCardModal && ( to the end of the return statement)
// And also remove the function definitions below it.
// The easiest way is to find {showReportCardModal && ( and cut from there down to just before the closing </div>\n  );\n}
const modalStartIdx = content.indexOf('{showReportCardModal && (');
if (modalStartIdx !== -1) {
  // we want to keep the closing of the main div
  const componentEndIdx = content.indexOf('  );\n}', modalStartIdx);
  content = content.substring(0, modalStartIdx) + content.substring(componentEndIdx);
}

// 6. Remove the functions numberToWords and SingleMarksheetCard
const funcsIdx = content.indexOf('// ─────────────────────────────────────────────────────────────\n// 📜 ST. G.N.G. SCHOOL OFFICIAL');
if (funcsIdx !== -1) {
  content = content.substring(0, funcsIdx);
}

fs.writeFileSync(file, content);
console.log('Cleanup done!');
