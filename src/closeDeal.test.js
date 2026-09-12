import { describe, it, expect } from 'vitest';
import { OUTCOME_SOURCES, isValidOutcomeSource, closeDealDuration } from './closeDeal';

describe('isValidOutcomeSource', () => {
  it('accepts every allowed source', () => {
    OUTCOME_SOURCES.forEach((s) => expect(isValidOutcomeSource(s)).toBe(true));
  });

  it('rejects unknown sources', () => {
    expect(isValidOutcomeSource('telegram')).toBe(false);
    expect(isValidOutcomeSource('')).toBe(false);
    expect(isValidOutcomeSource(undefined)).toBe(false);
  });
});

describe('closeDealDuration', () => {
  const now = new Date('2026-08-24T12:00:00Z');

  it('reports less than an hour', () => {
    const createdAt = new Date('2026-08-24T11:30:00Z').toISOString();
    expect(closeDealDuration(createdAt, now)).toEqual({ unit: 'lessHour', value: 0 });
  });

  it('reports whole hours', () => {
    const createdAt = new Date('2026-08-24T05:00:00Z').toISOString();
    expect(closeDealDuration(createdAt, now)).toEqual({ unit: 'hours', value: 7 });
  });

  it('reports days once past 24 hours', () => {
    const createdAt = new Date('2026-08-20T12:00:00Z').toISOString();
    expect(closeDealDuration(createdAt, now)).toEqual({ unit: 'days', value: 4 });
  });

  it('clamps a future createdAt to zero', () => {
    const createdAt = new Date('2026-08-25T00:00:00Z').toISOString();
    expect(closeDealDuration(createdAt, now)).toEqual({ unit: 'lessHour', value: 0 });
  });

  it('clamps an invalid date to zero', () => {
    expect(closeDealDuration('not-a-date', now)).toEqual({ unit: 'lessHour', value: 0 });
    expect(closeDealDuration(undefined, now)).toEqual({ unit: 'lessHour', value: 0 });
  });
});
