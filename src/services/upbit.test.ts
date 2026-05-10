import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchUpbitUsdtKrw, parseUpbitTicker } from './upbit';

describe('parseUpbitTicker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it('fetches USDT/KRW through the same-origin API proxy', async () => {
    const fetchMock = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          usdtKrw: 1402.5,
          source: {
            status: 'live',
            updatedAt: '2026-05-10T07:00:00.000Z',
          },
        }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchUpbitUsdtKrw()).resolves.toMatchObject({ usdtKrw: 1402.5 });
    expect(fetchMock).toHaveBeenCalledWith('/api/upbit/usdt-krw');
  });
});
