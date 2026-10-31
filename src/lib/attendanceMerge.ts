export function mergeAttendanceScope<T extends { id: string; studentId: string; date: string }>(
  previous: T[], records: T[], scope?: { startDate: string; endDate: string }, studentIds?: Set<string> | null,
): T[] {
  const retained = scope ? previous.filter(record => !(
    record.date >= scope.startDate && record.date <= scope.endDate && (!studentIds || studentIds.has(record.studentId))
  )) : [];
  return [...new Map([...retained, ...records].map(record => [record.id, record])).values()];
}
