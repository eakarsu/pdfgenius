'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PrototypeDataError,
  normalizeSyntheticEmail,
  validatePrototypePassword,
} = require('../src/config/prototype-data-policy');

test('normalizes a reserved synthetic email', () => {
  assert.equal(normalizeSyntheticEmail(' Reviewer@Example.Invalid '), 'reviewer@example.invalid');
});

for (const email of ['person@example.com', 'missing-at.invalid', '', null]) {
  test(`rejects non-synthetic email ${JSON.stringify(email)}`, () => {
    assert.throws(() => normalizeSyntheticEmail(email), PrototypeDataError);
  });
}

test('accepts bounded prototype credentials', () => {
  assert.equal(validatePrototypePassword('a'.repeat(12)), 'a'.repeat(12));
});

test('rejects short and excessively long passwords', () => {
  assert.throws(() => validatePrototypePassword('short'), PrototypeDataError);
  assert.throws(() => validatePrototypePassword('a'.repeat(129)), PrototypeDataError);
});
