#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const reportPath = process.argv[2];
if (!reportPath) {
  process.stderr.write('usage: node scripts/check-audit-baseline.js <npm-audit.json>\n');
  process.exit(2);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
} catch (error) {
  process.stderr.write(`dependency-audit: unreadable report: ${error.message}\n`);
  process.exit(2);
}

const status = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'PROJECT_STATUS.json'), 'utf8'),
);
const baseline = status.dependency_audit_baseline;
const actual = report.metadata?.vulnerabilities;
if (!actual) {
  process.stderr.write('dependency-audit: report has no vulnerability metadata\n');
  process.exit(2);
}

for (const severity of ['critical', 'high', 'moderate', 'low', 'total']) {
  if (!Number.isInteger(actual[severity])) {
    process.stderr.write(`dependency-audit: invalid ${severity} count\n`);
    process.exit(2);
  }
  if (actual[severity] > baseline[severity]) {
    process.stderr.write(
      `dependency-audit: ${severity} count ${actual[severity]} exceeds quarantine baseline ${baseline[severity]}\n`,
    );
    process.exit(1);
  }
}

if (actual.critical !== 0) {
  process.stderr.write('dependency-audit: critical vulnerabilities are never accepted\n');
  process.exit(1);
}

process.stdout.write(
  `dependency-audit: no regression (${actual.total} known vulnerabilities remain; production stays blocked)\n`,
);
