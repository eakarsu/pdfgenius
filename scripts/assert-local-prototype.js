#!/usr/bin/env node
'use strict';

require('dotenv').config();
const { assertLocalPrototypeRuntime } = require('../src/config/prototype-boundary');

try {
  assertLocalPrototypeRuntime();
  process.stderr.write('prototype-boundary: acknowledged local-only runtime\n');
} catch (error) {
  process.stderr.write(`prototype-boundary: ${error.message}\n`);
  process.exit(1);
}
