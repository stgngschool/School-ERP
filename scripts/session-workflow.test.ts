import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSession, planPromotion, planActivation, assertSessionIntent, requireCurrentAttendanceDate } from '../src/lib/sessionPolicy';
import { feeStructureName, selectSessionStructures } from '../src/lib/sessionFees';

const source = { id: 's1', name: '2026-2027', startDate: '2026-04-01', endDate: '2027-03-31', isCurrent: true };
const target = { id: 's2', name: '2027-2028', startDate: '2027-04-01', endDate: '2028-03-31', isCurrent: false };
const enrollment = { studentId: 'a', classId: 'c4', rollNumber: '7' };
const input = { source, target, sourceEnrollments: [enrollment], targetEnrollments: [], exitStudentIds: [], activeStudentIds: ['a'], classIds: ['c4', 'c5'], decisions: [{ studentId: 'a', decision: 'PROMOTE' as const, classId: 'c5' }] };

test('an old student edit form cannot undo an activated promotion', () => {
  assert.throws(() => assertSessionIntent('s1', 's2'), /outdated/);
  assert.throws(() => assertSessionIntent(undefined, 's2'), /outdated/);
  assert.doesNotThrow(() => assertSessionIntent('s2', 's2'));
});

test('new attendance is bound to a validated session, never an inferred calendar year', () => {
  assert.equal(requireCurrentAttendanceDate(source, '2026-10-28'), 's1');
  assert.throws(() => requireCurrentAttendanceDate(source, '2027-04-01'), /current academic session/);
  assert.throws(() => requireCurrentAttendanceDate(source, '2027-02-31'), /current academic session/);
});

test('session dates must agree with an April–March consecutive year', () => {
  assert.equal(validateSession(target).name, '2027-2028');
  assert.throws(() => validateSession({ ...target, name: '2027-2029' }));
  assert.throws(() => validateSession({ ...target, endDate: '2028-02-31' }));
});
test('promotion prepares a new enrollment without modifying the source', () => {
  const before = JSON.stringify(input);
  const plan = planPromotion(input);
  assert.deepEqual(plan.enrollments, [{ studentId: 'a', classId: 'c5', sessionId: 's2', rollNumber: null }]);
  assert.equal(JSON.stringify(input), before);
});
test('repeat preserves class, left creates no enrollment and does not require cleared fees', () => {
  assert.equal(planPromotion({ ...input, decisions: [{ studentId: 'a', decision: 'REPEAT' }] }).enrollments[0].classId, 'c4');
  const plan = planPromotion({ ...input, decisions: [{ studentId: 'a', decision: 'LEFT' }] });
  assert.deepEqual(plan.exits, ['a']);
  assert.deepEqual(plan.enrollments, []);
});
test('missing source enrollments, duplicate students and conflicting targets are rejected', () => {
  assert.throws(() => planPromotion({ ...input, sourceEnrollments: [] }), /enrollment/i);
  assert.throws(() => planPromotion({ ...input, decisions: [...input.decisions, ...input.decisions] }), /duplicate/i);
  assert.throws(() => planPromotion({ ...input, targetEnrollments: [{ ...enrollment, classId: 'c6' }] }), /already/i);
  assert.throws(() => planPromotion({ ...input, target: source }), /future/i);
});
test('an identical saved promotion is idempotent and cannot replace a left decision', () => {
  const plan = planPromotion({ ...input, targetEnrollments: [{ ...enrollment, classId: 'c5' }] });
  assert.equal(plan.skipped, 1);
  assert.deepEqual(plan.enrollments, []);
  assert.throws(() => planPromotion({ ...input, exitStudentIds: ['a'] }), /already/i);
});
test('activation requires every active outgoing student to have a decision', () => {
  assert.throws(() => planActivation({ sourceStudentIds: ['a', 'b'], activeStudentIds: ['a', 'b'], enrollments: [{ ...enrollment, classId: 'c5' }], exitStudentIds: [] }), /pending/i);
  const p = planActivation({ sourceStudentIds: ['a', 'b'], activeStudentIds: ['a', 'b'], enrollments: [{ ...enrollment, classId: 'c5' }], exitStudentIds: ['b'] });
  assert.deepEqual(p.exits, ['b']);
  assert.equal(p.classes[0].classId, 'c5');
  assert.throws(() => planActivation({ sourceStudentIds: [], activeStudentIds: ['a'], enrollments: [], exitStudentIds: [] }), /enrollment/i);
});
test('fee structures are isolated per session; legacy structures only belong to current session', () => {
  const old = { name: 'Class 4 Fee Structure', className: '4' };
  const next = { name: feeStructureName('2027-2028', old.name), className: '4' };
  assert.deepEqual(selectSessionStructures([old, next], '2027-2028', '2026-2027'), [next]);
  assert.deepEqual(selectSessionStructures([old, next], '2026-2027', '2026-2027'), [old]);
  assert.deepEqual(selectSessionStructures([old], '2027-2028', '2026-2027'), []);
});
