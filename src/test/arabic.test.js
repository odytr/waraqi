import { test } from 'node:test';
import assert from 'node:assert';
import { normalize } from '../lib/arabic.js';

test('alef forms unify', () => {
  assert.equal(normalize('إيجار'), normalize('ايجار'));
  assert.equal(normalize('أحمد'),  normalize('احمد'));
});
test('diacritics are stripped', () => {
  assert.equal(normalize('مُسْتَشْفَى'), normalize('مستشفي'));
});
test('arabic-indic digits become latin', () => {
  assert.equal(normalize('١٥٠٠'), '1500');
});