import { describe, expect, it } from 'vitest';
import { parseUpbitTicker } from './upbit';

describe('parseUpbitTicker', () => {
  it('reads the KRW-USDT trade price from Upbit ticker payloads', () => {
    const quote = parseUpbitTicker([
      {
        market: 'KRW-USDT',
        trade_price: 1402.5,
        timestamp: 1778396400000,
      },
    ]);

    expect(quote.usdtKrw).toBe(1402.5);
    expect(quote.source.status).toBe('live');
    expect(quote.source.updatedAt).toBe('2026-05-10T07:00:00.000Z');
  });
});
