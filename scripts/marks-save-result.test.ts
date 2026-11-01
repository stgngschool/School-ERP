import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertMarksSaved } from '../src/lib/marksSaveResult';
test('marks screen accepts only a fully confirmed save', () => {
  assert.doesNotThrow(() => assertMarksSaved({ count: 2, failedStudentIds: [], warnings: [] }, 2));
  assert.throws(() => assertMarksSaved({ count: 1, failedStudentIds: ['b'] }, 2), /1 of 2/);
  assert.throws(() => assertMarksSaved({ count: 1, warnings: ['Invalid marks'] }, 2), /Invalid marks/);
  assert.throws(() => assertMarksSaved({ count: 0 }, 1));
  assert.throws(() => assertMarksSaved({}, 1));
});
