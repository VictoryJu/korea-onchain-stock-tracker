import { describe, expect, it } from 'vitest';
import { createUpbitUsdtKrwHandler } from './usdt-krw';

function createResponse() {
  return {
    statusCode: 200,
    headers: new Map<string, string>(),
    body: '',
    setHeader(name: string, value: string) {
      this.headers.set(name, value);
    },
    end(body: string) {
      this.body = body;
    },
  };
}

describe('upbit usdt-krw API handler', () => {
  it('returns parsed USDT/KRW quote JSON', async () => {
    const response = createResponse();
    const handler = createUpbitUsdtKrwHandler(async () => [
      {
        market: 'KRW-USDT',
        trade_price: 1402.5,
        timestamp: 1778396400000,
      },
    ]);

    await handler({}, response);

    expect(response.statusCode).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(JSON.parse(response.body)).toEqual({
      usdtKrw: 1402.5,
      source: {
        status: 'live',
        updatedAt: '2026-05-10T07:00:00.000Z',
        message: 'Upbit KRW-USDT ticker via server proxy',
      },
    });
  });

  it('returns a 502 JSON error when Upbit fails', async () => {
    const response = createResponse();
    const handler = createUpbitUsdtKrwHandler(async () => {
      throw new Error('upbit failed');
    });

    await handler({}, response);

    expect(response.statusCode).toBe(502);
    expect(JSON.parse(response.body)).toEqual({ error: 'upbit failed' });
  });
});
