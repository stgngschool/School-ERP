const key = (exam: string) => exam.trim().toLowerCase();

export function defaultOpenExam(exams: string[], locked: string[] = [], openedOrder: string[] = []) {
  const open = exams.filter(exam => !locked.some(item => key(item) === key(exam)));
  for (const recent of [...openedOrder].reverse()) {
    const match = open.find(exam => key(exam) === key(recent));
    if (match) return match;
  }
  // Existing configurations have no unlock history; prefer the latest listed open term.
  return open.at(-1) || exams[0] || 'Unit-1';
}

export function updatedExamOpenOrder(exams: string[], previousLocked: string[], nextLocked: string[], previousOrder: string[] = []) {
  const reopened = exams.filter(exam => previousLocked.some(item => key(item) === key(exam)) && !nextLocked.some(item => key(item) === key(exam)));
  return [...previousOrder.filter(exam => exams.some(item => key(item) === key(exam)) && !reopened.some(item => key(item) === key(exam))), ...reopened];
}
