import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultOpenExam, updatedExamOpenOrder } from '../src/lib/examDefault';
const exams = ['Unit-1', 'Half Yearly', 'Unit-2', 'Annual'];
test('only open exam is default, while all locked exams remain viewable', () => {
  assert.equal(defaultOpenExam(exams, ['Unit-1', 'Unit-2', 'Annual']), 'Half Yearly');
  assert.equal(defaultOpenExam(exams, exams), 'Unit-1');
});
test('most recently reopened exam wins even if it is an earlier term', () => {
  const order = updatedExamOpenOrder(exams, ['Unit-1', 'Annual'], ['Annual'], ['Half Yearly', 'Unit-2']);
  assert.equal(defaultOpenExam(exams, ['Annual'], order), 'Unit-1');
  assert.deepEqual(updatedExamOpenOrder(exams, ['Annual'], ['Annual'], order), order);
});
test('locked or removed exams never become default from old history', () => {
  assert.equal(defaultOpenExam(exams, ['Annual'], ['Removed', 'Unit-2', 'Annual']), 'Unit-2');
  assert.equal(defaultOpenExam(exams, ['Annual'], []), 'Unit-2');
  assert.equal(defaultOpenExam(exams, ['unit-1', 'unit-2', 'ANNUAL'], ['half yearly']), 'Half Yearly');
});
