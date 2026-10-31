export interface SearchableStudent {
  id: string;
  name?: string | null;
  admissionNo?: string | null;
  rollNo?: number | string | null;
  familyCode?: string | null;
}

export function searchStudents<T extends SearchableStudent>(students: T[], query: string, limit = 8): T[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return students.filter(student => [
    student.name, student.admissionNo, student.rollNo, student.familyCode,
  ].some(value => value != null && String(value).toLowerCase().includes(term))).slice(0, limit);
}
