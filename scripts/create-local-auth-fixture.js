#!/usr/bin/env node
'use strict';

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DISPOSABLE_SEED !== 'YES') {
  throw new Error('Local administrator provisioning requires the disposable-test acknowledgement');
}

const { normalizeSyntheticEmail, validatePrototypePassword } = require('../src/config/prototype-data-policy');
const User = require('../src/models/User');
const { sequelize } = require('../src/config/database');

async function main() {
  const requestedEmail = process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '';
  const email = normalizeSyntheticEmail(requestedEmail.endsWith('.invalid') ? requestedEmail : 'runtime-admin@example.invalid');
  const password = validatePrototypePassword(process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '');
  const name = String(process.env.PROVISION_ADMIN_NAME || process.env.BOOTSTRAP_ADMIN_NAME || 'Runtime Administrator').trim();
  let user = await User.findOne({ where: { email } });
  if (!user) user = await User.create({ email, password_hash: password, name, role: 'admin', is_active: true });
  else {
    user.password_hash = password;
    user.name = name;
    user.role = 'admin';
    user.is_active = true;
    await user.save();
  }
  console.log(`provisioned ${email} as local synthetic administrator`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => sequelize.close());
