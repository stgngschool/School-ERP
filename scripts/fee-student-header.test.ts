import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Header from '../src/components/accountant/FeeStudentHeader';

const props = { student: { name: 'Student', class: '2', section: 'A', admissionNo: '1545', fatherMobile: '1234567890', familyCode: 'FAM-1' } as never,
  siblingCount: 2, invoiceCount: 11, totalDue: 610000, loading: false, error: false, onBack() {}, onProfile() {} };
test('family balance is labelled correctly and retains student navigation', () => {
  const html = renderToStaticMarkup(React.createElement(Header, props));
  for (const text of ['Family outstanding', '11 unpaid invoices', '2 children linked', '1545', 'tel:1234567890', 'View profile', 'Back to search']) assert.ok(html.includes(text), text);
});
test('unverified balances never display stale amounts or claim free education', () => {
  for (const state of [{ loading: true }, { error: true }]) {
    const html = renderToStaticMarkup(React.createElement(Header, { ...props, ...state }));
    assert.ok(!html.includes('6,100'));
  }
  const html = renderToStaticMarkup(React.createElement(Header, { ...props, student: { ...props.student as object, isRte: true } as never }));
  assert.ok(!html.includes('100% Free'));
});
