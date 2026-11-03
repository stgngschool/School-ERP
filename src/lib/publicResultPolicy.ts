import { createHash } from 'node:crypto';

// Failure counters are scoped to a student AND network, without storing DOB.
export function publicResultFailureKey(admission: string, ip: string) {
  return 'public-results:failure:' + createHash('sha256').update(JSON.stringify([admission.trim().toLowerCase(), ip])).digest('hex');
}

// Only used after a fresh student lookup and successful DOB verification.
export function publicResultCacheKey(studentId: string, verifiedDob: string, sessionId: string, exam: string) {
  return createHash('sha256').update(JSON.stringify([studentId, verifiedDob, sessionId, exam])).digest('hex');
}
