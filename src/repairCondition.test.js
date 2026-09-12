import { describe, it, expect } from 'vitest';
import {
  REPAIR_CONDITIONS,
  REPAIR_LABELS,
  REPAIR_HINTS,
  isValidRepairCondition,
  repairConditionLabel,
  repairConditionHint
} from './repairCondition';

describe('isValidRepairCondition', () => {
  it('accepts every enum value', () => {
    REPAIR_CONDITIONS.forEach((v) => expect(isValidRepairCondition(v)).toBe(true));
  });

  it('rejects the legacy sentinel and other unknown values', () => {
    expect(isValidRepairCondition('unspecified')).toBe(false);
    expect(isValidRepairCondition('luxury')).toBe(false);
    expect(isValidRepairCondition('')).toBe(false);
    expect(isValidRepairCondition(undefined)).toBe(false);
    expect(isValidRepairCondition(null)).toBe(false);
  });
});

describe('labels and hints', () => {
  it('has a HY/RU/EN triple for every enum value', () => {
    REPAIR_CONDITIONS.forEach((v) => {
      expect(REPAIR_LABELS[v]).toHaveLength(3);
      expect(REPAIR_HINTS[v]).toHaveLength(3);
      REPAIR_LABELS[v].forEach((s) => expect(s.length).toBeGreaterThan(0));
      REPAIR_HINTS[v].forEach((s) => expect(s.length).toBeGreaterThan(0));
    });
  });

  it('repairConditionLabel returns the label at the given language index', () => {
    expect(repairConditionLabel('good', 1)).toBe('Хороший современный ремонт');
    expect(repairConditionLabel('good', 2)).toBe('Good modern renovation');
    expect(repairConditionLabel('good', 0)).toBe('Լավ ժամանակակից վերանորոգում');
  });

  it('returns null for an invalid value instead of guessing', () => {
    expect(repairConditionLabel('unspecified', 1)).toBeNull();
    expect(repairConditionHint('', 1)).toBeNull();
  });
});
