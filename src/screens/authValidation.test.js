import { describe, it, expect } from 'vitest';
import { singleFieldInvalid, entryInvalidFields, passwordStepInvalidFields } from './authValidation';

describe('entryInvalidFields', () => {
  it('flags both phone and password when both are empty', () => {
    expect(entryInvalidFields({ phoneOk: false, hasPassword: false })).toEqual(['phone', 'password']);
  });

  it('flags only the phone when the password is filled in', () => {
    expect(entryInvalidFields({ phoneOk: false, hasPassword: true })).toEqual(['phone']);
  });

  it('flags nothing when both are valid', () => {
    expect(entryInvalidFields({ phoneOk: true, hasPassword: true })).toEqual([]);
  });
});

describe('passwordStepInvalidFields', () => {
  it('flags both fields when the password is too short and confirm differs', () => {
    expect(passwordStepInvalidFields({ pwOk: false, matches: false })).toEqual(['password', 'confirm']);
  });

  it('does not flag confirm when it matches an otherwise invalid password', () => {
    expect(passwordStepInvalidFields({ pwOk: false, matches: true })).toEqual(['password']);
  });

  it('flags nothing when the password is valid and confirmed', () => {
    expect(passwordStepInvalidFields({ pwOk: true, matches: true })).toEqual([]);
  });
});

describe('singleFieldInvalid', () => {
  it('returns the field name when invalid', () => {
    expect(singleFieldInvalid('code', false)).toEqual(['code']);
  });

  it('returns an empty list when valid', () => {
    expect(singleFieldInvalid('code', true)).toEqual([]);
  });
});
