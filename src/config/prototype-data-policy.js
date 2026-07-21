'use strict';

class PrototypeDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrototypeDataError';
    this.code = 'PROTOTYPE_DATA_POLICY';
  }
}

function normalizeSyntheticEmail(value) {
  if (typeof value !== 'string') {
    throw new PrototypeDataError('A synthetic .invalid email address is required');
  }
  const email = value.trim().toLowerCase();
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.invalid$/.test(email)) {
    throw new PrototypeDataError('Email must use the reserved .invalid domain for local evaluation');
  }
  return email;
}

function validatePrototypePassword(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) {
    throw new PrototypeDataError('Password must contain 12 to 128 characters');
  }
  return value;
}

module.exports = {
  PrototypeDataError,
  normalizeSyntheticEmail,
  validatePrototypePassword,
};
