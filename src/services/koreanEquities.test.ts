import { describe, expect, it } from 'vitest';
import { getDomesticFallbackQuotes } from './koreanEquities';

describe('getDomesticFallbackQuotes', () => {
  it('returns seed Korean market rows marked as fallback data', () => {
    const rows = getDomesticFallbackQuotes();

    expect(rows).toHaveLength(5);
    expect(rows[0].symbol).toBe('005930.KS');
    expect(rows[0].source.status).toBe('fallback');
    expect(rows.some((row) => row.symbol === '000660.KS')).toBe(true);
  });
});
