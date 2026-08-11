const fs = require('fs');
const file = 'src/components/PrintMarksheets.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Search, CheckCircle2, Loader2 to imports
content = content.replace(
  /Printer,\n  Layers,\n  BookOpen\n} from "lucide-react";/,
  'Printer,\n  Layers,\n  BookOpen,\n  Search,\n  CheckCircle2,\n  Loader2\n} from "lucide-react";'
);

// 2. Add refreshBilling to useAuth
content = content.replace(
  /const { students, schoolInfo } = useAuth\(\);/,
  'const { students, schoolInfo, refreshBilling } = useAuth();'
);

// 3. Add states
content = content.replace(
  /const \[isBulkPrintMode, setIsBulkPrintMode\] = useState\(false\);/,
  `const [isBulkPrintMode, setIsBulkPrintMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [classMarks, setClassMarks] = useState<any[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [claiming, setClaiming] = useState(false);`
);

// 4. Update the useEffects and filter
content = content.replace(
  /const classStudents = students.filter\([\s\S]*?\n  \);\n\n  useEffect\(\(\) => {[\s\S]*?\}, \[classStudents, selectedReportCardStudentId\]\);/m,
  `const classStudents = students.filter(
    (s) => \`\${s.class}-\${s.section}\` === selectedClass
  );

  const filteredStudents = classStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.rollNo && s.rollNo.includes(searchQuery)) ||
    (s.admissionNo && s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    if (filteredStudents.length > 0 && !selectedReportCardStudentId) {
      setSelectedReportCardStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedReportCardStudentId]);

  useEffect(() => {
    if (!selectedClass) return;
    const [cName, cSec] = selectedClass.split("-");
    setLoadingMarks(true);
    fetch(\`/api/marks/class?class=\${encodeURIComponent(cName)}&section=\${encodeURIComponent(cSec)}\`)
      .then(res => res.json())
      .then(data => {
        setClassMarks(Array.isArray(data) ? data : []);
        setLoadingMarks(false);
      })
      .catch(err => {
        console.error("Failed to fetch marks", err);
        setLoadingMarks(false);
      });
  }, [selectedClass]);

  const handleClaimToggle = async (student: any) => {
    try {
      setClaiming(true);
      const res = await fetch(\`/api/students/claim-marksheet\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, isMarksheetClaimed: !student.isMarksheetClaimed })
      });
      if (res.ok) {
        await refreshBilling(); // Refresh students to get the new claim status
      }
    } finally {
      setClaiming(false);
    }
  };`
);

// 5. Replace grid with search bar and select
content = content.replace(
  /<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">[\s\S]*?<\/div>\s*<\/div>\s*<div className="flex gap-3 mt-5">/m,
  `<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setIsBulkPrintMode(false);
                setSelectedReportCardStudentId("");
              }}
              className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
            >
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Search & Select Student
            </label>
            <div className="flex gap-2">
              <div className="relative w-1/2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, roll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-bold border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
                />
              </div>
              <select
                value={selectedReportCardStudentId}
                onChange={(e) => {
                  setSelectedReportCardStudentId(e.target.value);
                  setIsBulkPrintMode(false);
                }}
                className="w-1/2 text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
              >
                {filteredStudents.map((std) => (
                  <option key={std.id} value={std.id}>
                    {std.name} (Roll: {std.rollNo || "--"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
              Exam Scope
            </label>
            <select
              value={selectedReportCardExam}
              onChange={(e) => setSelectedReportCardExam(e.target.value)}
              className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-indigo-600 text-slate-700 shadow-2xs"
            >
              <option value="All">All Exams Summary</option>
              {availableExams.map((ex) => (
                <option key={ex} value={ex}>{ex} Only</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
`
);

// 6. Update bulk print button text 
content = content.replace(
  /<button\n            type="button"\n            onClick={\(\) => {\n              setIsBulkPrintMode\(true\);\n              setTimeout\(\(\) => window.print\(\), 100\);\n            }}\n            className="flex-1 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all"\n          >\n            <Layers className="h-4 w-4" \/> Print Full Class \(\{classStudents.length\}\)\n          <\/button>/m,
  `<button
            type="button"
            disabled={loadingMarks}
            onClick={() => {
              setIsBulkPrintMode(true);
              setTimeout(() => window.print(), 1000); // extra delay for 500+
            }}
            className="flex-1 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {loadingMarks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />} 
            Bulk Print Class ({classStudents.length})
          </button>`
);

content = content.replace(
  /<button\n            type="button"\n            onClick={\(\) => {\n              setIsBulkPrintMode\(false\);\n              setTimeout\(\(\) => window.print\(\), 100\);\n            }}/m,
  `<button
            type="button"
            disabled={loadingMarks}
            onClick={() => {
              setIsBulkPrintMode(false);
              setTimeout(() => window.print(), 100);
            }}`
);

// 7. Render Claim button below preview, AND pass classMarks
content = content.replace(
  /          <div className="space-y-8 w-full max-w-\[210mm\]">\n            \{classStudents.map\(\(std\) => \(\n              <SingleMarksheetCard\n                key=\{std.id\}\n                student=\{std\}\n                availableExams=\{availableExams\}\n                selectedReportCardExam=\{selectedReportCardExam\}\n                getCbseGrade=\{getCbseGrade\}\n              \/>\n            \)\)\}\n          <\/div>\n        \) : \(\n          \(\(\) => {\n            const student = classStudents.find\(\(s\) => s.id === selectedReportCardStudentId\) \|\| classStudents\[0\];\n            if \(\!student\) return <p className="text-slate-400 font-bold no-print">No student found.<\/p>;\n            return \(\n              <SingleMarksheetCard\n                student=\{student\}\n                availableExams=\{availableExams\}\n                selectedReportCardExam=\{selectedReportCardExam\}\n                getCbseGrade=\{getCbseGrade\}\n              \/>\n            \);\n          }\)\(\)\n        \)\}/m,
  `          {loadingMarks ? (
            <div className="flex flex-col items-center justify-center py-20 text-indigo-600 no-print">
              <Loader2 className="h-10 w-10 animate-spin mb-4" />
              <p className="font-bold">Loading Academic Data...</p>
            </div>
          ) : isBulkPrintMode ? (
          <div className="space-y-8 w-full max-w-[210mm]">
            {classStudents.map((std) => (
              <SingleMarksheetCard
                key={std.id}
                student={std}
                availableExams={availableExams}
                selectedReportCardExam={selectedReportCardExam}
                getCbseGrade={getCbseGrade}
                classMarks={classMarks}
              />
            ))}
          </div>
        ) : (
          (() => {
            const student = classStudents.find((s) => s.id === selectedReportCardStudentId) || classStudents[0];
            if (!student) return <p className="text-slate-400 font-bold no-print">No student found.</p>;
            return (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-4 mb-4 no-print w-full justify-end max-w-[210mm]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                    <span className={\`text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wider \${student.isMarksheetClaimed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}\`}>
                      {student.isMarksheetClaimed ? "Claimed ✅" : "Unclaimed ❌"}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={() => handleClaimToggle(student)}
                    className={\`py-2 px-4 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm \${student.isMarksheetClaimed ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}\`}
                  >
                    {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {student.isMarksheetClaimed ? "Mark Unclaimed" : "Mark as Claimed"}
                  </button>
                </div>
                <SingleMarksheetCard
                  student={student}
                  availableExams={availableExams}
                  selectedReportCardExam={selectedReportCardExam}
                  getCbseGrade={getCbseGrade}
                  classMarks={classMarks}
                />
              </div>
            );
          })()
        )}`
);

// 8. Update SingleMarksheetCard Props and Math logic
content = content.replace(
  /function SingleMarksheetCard\(\{[\s\S]*?getCbseGrade,\n\}: \{[\s\S]*?\}\) \{\n  const sMarks: any\[\] = student.marks \|\| \[\];/m,
  `function SingleMarksheetCard({
  student,
  availableExams,
  selectedReportCardExam,
  getCbseGrade,
  classMarks,
}: {
  student: any;
  availableExams: string[];
  selectedReportCardExam: string;
  getCbseGrade: (pct: number) => string;
  classMarks: any[];
}) {
  const sMarks: any[] = classMarks.filter(m => m.studentId === student.id);`
);

// Update math logic
content = content.replace(
  /    const t1Score = t1Match \? t1Match.marksObtained : \(subMarks\[0\] \? Math.round\(subMarks\[0\].marksObtained \* 0.9\) : 50 \+ \(\(idx \* 7\) % 35\)\);\n    const prAct1 = Math.min\(10, Math.max\(4, Math.round\(t1Score \* 0.12\)\)\);\n    const noteBook1 = Math.min\(5, Math.max\(3, Math.round\(t1Score \* 0.06\)\)\);\n    const subEnri1 = Math.min\(5, Math.max\(3, Math.round\(t1Score \* 0.06\)\)\);\n    const halfYearly1 = Math.min\(80, Math.max\(20, t1Score - prAct1 - noteBook1 - subEnri1\)\);\n    const obt1 = prAct1 \+ noteBook1 \+ subEnri1 \+ halfYearly1;\n\n    const t2Match = subMarks.find\(\(m\) => m.examName.toLowerCase\(\).includes\("yearly"\) \|\| m.examName.toLowerCase\(\).includes\("term 2"\) \|\| m.examName.toLowerCase\(\).includes\("final"\)\);\n    const t2Score = t2Match \? t2Match.marksObtained : \(subMarks\[1\] \? subMarks\[1\].marksObtained : Math.min\(100, t1Score \+ 8 - \(idx % 4\)\)\);\n    const prAct2 = Math.min\(10, Math.max\(4, Math.round\(t2Score \* 0.11\)\)\);\n    const noteBook2 = Math.min\(5, Math.max\(3, Math.round\(t2Score \* 0.06\)\)\);\n    const subEnri2 = Math.min\(5, Math.max\(3, Math.round\(t2Score \* 0.06\)\)\);\n    const yearly2 = Math.min\(80, Math.max\(20, t2Score - prAct2 - noteBook2 - subEnri2\)\);\n    const obt2 = prAct2 \+ noteBook2 \+ subEnri2 \+ yearly2;/m,
  `    let prAct1 = 0, noteBook1 = 0, subEnri1 = 0, halfYearly1 = 0, obt1 = 0;
    if (t1Match) {
      const b1 = t1Match.breakdown || {};
      prAct1 = b1["Practical / Activity"] ? parseFloat(b1["Practical / Activity"]) : (t1Match.practical || 0);
      noteBook1 = b1["Notebook"] ? parseFloat(b1["Notebook"]) : (t1Match.notebook || 0);
      subEnri1 = b1["Subject Enrichment"] ? parseFloat(b1["Subject Enrichment"]) : (t1Match.subjectEnrichment || 0);
      halfYearly1 = b1["Written Exam"] ? parseFloat(b1["Written Exam"]) : (t1Match.writtenExam || Math.max(0, t1Match.marksObtained - prAct1 - noteBook1 - subEnri1));
      obt1 = prAct1 + noteBook1 + subEnri1 + halfYearly1;
    }

    const t2Match = subMarks.find((m) => m.examName.toLowerCase().includes("yearly") || m.examName.toLowerCase().includes("term 2") || m.examName.toLowerCase().includes("final"));
    let prAct2 = 0, noteBook2 = 0, subEnri2 = 0, yearly2 = 0, obt2 = 0;
    if (t2Match) {
      const b2 = t2Match.breakdown || {};
      prAct2 = b2["Practical / Activity"] ? parseFloat(b2["Practical / Activity"]) : (t2Match.practical || 0);
      noteBook2 = b2["Notebook"] ? parseFloat(b2["Notebook"]) : (t2Match.notebook || 0);
      subEnri2 = b2["Subject Enrichment"] ? parseFloat(b2["Subject Enrichment"]) : (t2Match.subjectEnrichment || 0);
      yearly2 = b2["Written Exam"] ? parseFloat(b2["Written Exam"]) : (t2Match.writtenExam || Math.max(0, t2Match.marksObtained - prAct2 - noteBook2 - subEnri2));
      obt2 = prAct2 + noteBook2 + subEnri2 + yearly2;
    }`
);

fs.writeFileSync(file, content);
console.log('Update Complete!');
