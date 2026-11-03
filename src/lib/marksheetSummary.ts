import { isAbsentRemark } from "./marksAbsence";

type Mark = {
  subject: string;
  examName: string;
  marksObtained: number;
  maxMarks?: number;
  remarks?: string | null;
  breakdown?: Record<string, number | string> | null;
  practical?: number;
  notebook?: number;
  subjectEnrichment?: number;
  writtenExam?: number;
};

export function normalizeMarksheetSubject(subject: string): string {
  const value = subject.trim().toUpperCase();
  if (["SCIENCE", "EVS", "SCIENCE/EVS"].includes(value)) return "SCIENCE/EVS";
  if (["GK", "G.K.", "GENERAL KNOWLEDGE"].includes(value)) return "G.K.";
  if (["ART", "DRAWING"].includes(value)) return "DRAWING";
  if (["SST", "SOCIAL STUDIES", "SOCIAL SCIENCE"].includes(value)) return "SOCIAL SCIENCE";
  if (["COMPUTER SCIENCE", "COMPUTER"].includes(value)) return "COMPUTER";
  return value;
}

const examKey = (value: string) => value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
const halfYearly = (m: Mark) => /half|term 1/.test(examKey(m.examName));
const annual = (m: Mark) => !halfYearly(m) && /annual|final|term 2|yearly/.test(examKey(m.examName));
const unit1 = (m: Mark) => examKey(m.examName).includes("unit 1");
const unit2 = (m: Mark) => examKey(m.examName).includes("unit 2");

function components(mark?: Mark) {
  const b = mark?.breakdown || {};
  const practical = b["Practical / Activity"] ?? b["Pr. Act."] ?? b.Practical ?? mark?.practical;
  const notebook = b.Notebook ?? b["Note Book"] ?? mark?.notebook;
  const enrichment = b["Subject Enrichment"] ?? b["Sub. Enrich."] ?? mark?.subjectEnrichment;
  return { practical: practical == null ? null : Number(practical), notebook: notebook == null ? null : Number(notebook), enrichment: enrichment == null ? null : Number(enrichment) };
}

function term(unit?: Mark, main?: Mark) {
  // Older records can contain the entire 100-mark term in one main-exam entry.
  // Current 20/80 records combine the unit's internal assessment with the main exam.
  const integrated = !!main && Number(main.maxMarks) > 80;
  const internal = integrated ? main : unit;
  const c = components(internal);
  const b = main?.breakdown || {};
  const internalTotal = (c.practical ?? 0) + (c.notebook ?? 0) + (c.enrichment ?? 0);
  const written = !main ? null : Number(b["Written Exam"] ?? b.Written ?? main.writtenExam ?? Math.max(0, Number(main.marksObtained) - (integrated ? internalTotal : 0)));
  const unitAbsent = isAbsentRemark(unit?.remarks);
  const mainAbsent = isAbsentRemark(main?.remarks);
  const unitObtained = unit ? (unitAbsent ? 0 : Number(unit.marksObtained)) : 0;
  const mainObtained = main ? (mainAbsent ? 0 : Number(main.marksObtained)) : 0;
  const present = !!unit || !!main;
  const records = integrated ? [main!] : [unit, main].filter((m): m is Mark => !!m);
  return {
    ...c, written,
    obtained: present ? (integrated ? mainObtained : unitObtained + mainObtained) : null,
    max: records.reduce((sum, m) => sum + (Number(m.maxMarks) > 0 ? Number(m.maxMarks) : m === unit ? 20 : 80), 0),
    absent: present && records.every(m => isAbsentRemark(m.remarks)),
    internalAbsent: !!internal && isAbsentRemark(internal.remarks), writtenAbsent: !!main && mainAbsent,
    present, complete: integrated || (!!unit && !!main),
  };
}

export function buildMarksheetSummary(marks: Mark[], curriculum: string[], scope: string) {
  const selected = scope === "All" ? marks : marks.filter(mark => examKey(mark.examName) === examKey(scope));
  // Keep the student's known subjects visible when this scope has no entry for one.
  const recorded = [...new Set(marks.map(mark => normalizeMarksheetSubject(mark.subject)))];
  const defaults = [...new Set(curriculum.map(normalizeMarksheetSubject))];
  const subjects = [...defaults, ...recorded.filter(subject => !defaults.includes(subject))];
  const rows = subjects.map(subName => {
    const records = selected.filter(mark => normalizeMarksheetSubject(mark.subject) === subName);
    let main1 = records.find(halfYearly);
    const main2 = records.find(annual);
    const u1 = records.find(unit1);
    const u2 = records.find(unit2);
    if (!main1 && !main2 && !u1 && !u2) main1 = records[0];
    const t1 = term(u1, main1);
    const t2 = term(u2, main2);
    return {
      subName,
      prAct1: t1.practical, noteBook1: t1.notebook, subEnri1: t1.enrichment, halfYearly1: t1.written, obt1: t1.obtained,
      prAct2: t2.practical, noteBook2: t2.notebook, subEnri2: t2.enrichment, yearly2: t2.written, obt2: t2.obtained,
      hasTerm1: t1.present, hasTerm2: t2.present,
      complete: t1.complete && t2.complete,
      internalAbsent1: t1.internalAbsent, internalAbsent2: t2.internalAbsent,
      writtenAbsent1: t1.writtenAbsent, writtenAbsent2: t2.writtenAbsent,
      isAbsent1: t1.absent, isAbsent2: t2.absent,
      maxM: t1.max + t2.max,
      totalTermObt: (t1.obtained ?? 0) + (t2.obtained ?? 0),
    };
  });
  return {
    rows,
    isComplete: rows.length > 0 && rows.every(row => row.complete),
    hasData: rows.some(row => row.hasTerm1 || row.hasTerm2),
    hasTerm1: rows.some(row => row.hasTerm1),
    hasTerm2: rows.some(row => row.hasTerm2),
    term1TotalObtained: rows.reduce((sum, row) => sum + (row.obt1 ?? 0), 0),
    term2TotalObtained: rows.reduce((sum, row) => sum + (row.obt2 ?? 0), 0),
    grandMaxTotal: rows.reduce((sum, row) => sum + row.maxM, 0),
    grandObtTotal: rows.reduce((sum, row) => sum + row.totalTermObt, 0),
  };
}
