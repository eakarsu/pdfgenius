#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const { Client } = require('pg');

const migrationName = '001_local_prototype_users';
const migration = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN
  CREATE TYPE enum_users_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role enum_users_role NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

function assertDisposableTarget() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DISPOSABLE_SEED !== 'YES') {
    throw new Error('Local fixture migration requires the disposable-test acknowledgement');
  }
  const url = new URL(process.env.DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error('Local fixture migration requires loopback PostgreSQL');
  }
}

async function main() {
  assertDisposableTarget();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const checksum = crypto.createHash('sha256').update(migration).digest('hex');
    const existing = (await client.query('SELECT checksum FROM schema_migrations WHERE name=$1', [migrationName])).rows[0];
    if (existing) {
      if (existing.checksum !== checksum) throw new Error('Local fixture migration checksum changed');
      console.log(`already applied ${migrationName}`);
      return;
    }
    await client.query('BEGIN');
    try {
      await client.query(migration);
      await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [migrationName, checksum]);
      await client.query('COMMIT');
      console.log(`applied ${migrationName}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
