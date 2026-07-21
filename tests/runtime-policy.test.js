'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ACKNOWLEDGEMENT,
  PrototypeBoundaryError,
  assertLocalPrototypeRuntime,
} = require('../src/config/prototype-boundary');

function validEnv(overrides = {}) {
  return {
    NODE_ENV: 'development',
    PDFGENIUS_PROTOTYPE_ACK: ACKNOWLEDGEMENT,
    DATABASE_URL: 'postgresql://prototype:synthetic@127.0.0.1:5432/pdfgenius',
    JWT_SECRET: 'x'.repeat(32),
    CORS_ORIGINS: 'http://127.0.0.1:3000',
    ...overrides,
  };
}

test('accepts an explicitly acknowledged local synthetic runtime', () => {
  assert.deepEqual(assertLocalPrototypeRuntime(validEnv()), {
    mode: 'local-prototype',
    origins: ['http://127.0.0.1:3000'],
  });
});

for (const [name, env] of [
  ['production', validEnv({ NODE_ENV: 'production' })],
  ['missing acknowledgement', validEnv({ PDFGENIUS_PROTOTYPE_ACK: '' })],
  ['missing database URL', validEnv({ DATABASE_URL: '' })],
  ['remote database URL', validEnv({ DATABASE_URL: 'postgresql://prototype:synthetic@db.example.invalid/pdfgenius' })],
  ['short JWT secret', validEnv({ JWT_SECRET: 'short' })],
  ['wildcard CORS', validEnv({ CORS_ORIGINS: '*' })],
  ['remote CORS', validEnv({ CORS_ORIGINS: 'https://app.example.invalid' })],
  ['missing CORS', validEnv({ CORS_ORIGINS: '' })],
]) {
  test(`rejects ${name}`, () => {
    assert.throws(() => assertLocalPrototypeRuntime(env), PrototypeBoundaryError);
  });
}
