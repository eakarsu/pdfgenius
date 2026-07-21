#!/usr/bin/env node
'use strict';

const operation = process.argv[2] || 'operation';
process.stderr.write(
  `prototype-boundary: ${operation} is disabled; no reviewed migration/seed contract exists\n`,
);
process.exit(1);
