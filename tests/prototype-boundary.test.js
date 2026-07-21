'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

test('repository boundary verifier accepts the retained prototype', () => {
  const result = spawnSync(process.execPath, ['scripts/verify-prototype-boundary.js'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /verified local-only quarantine/);
});

test('direct production server execution is refused before initialization', () => {
  const result = spawnSync(process.execPath, ['server.js'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PDFGENIUS_PROTOTYPE_ACK: 'I_UNDERSTAND_PDFGENIUS_IS_LOCAL_ONLY',
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /Production runtime is disabled/);
});

for (const operation of ['seed', 'db:sync']) {
  test(`${operation} command fails closed`, () => {
    const result = spawnSync(process.execPath, ['scripts/blocked-operation.js', operation], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /is disabled/);
  });
}
