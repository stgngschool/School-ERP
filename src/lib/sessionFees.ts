// Session scope lives in the existing unique structure name; no schema migration.
const PREFIX = /^\[Session (20\d{2}-20\d{2})\] /;
export function feeStructureYear(name: string) { return name.match(PREFIX)?.[1] ?? null; }
export function feeStructureLabel(name: string) { return name.replace(PREFIX, ''); }
export function feeStructureName(year: string, label: string) {
  if (!/^20\d{2}-20\d{2}$/.test(year)) throw new Error('Invalid academic year.');
  return `[Session ${year}] ${feeStructureLabel(label)}`;
}
export function selectSessionStructures<T extends { name: string; className: string | null }>(structures: T[], year: string, currentYear: string | undefined) {
  const scoped = structures.filter(s => feeStructureYear(s.name) === year);
  const scopedClasses = new Set(scoped.map(s => s.className));
  return [...(year === currentYear ? structures.filter(s => !feeStructureYear(s.name) && !scopedClasses.has(s.className)) : []), ...scoped];
}
