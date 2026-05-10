import { describe, expect, it } from 'vitest';
import { createDomesticTopTurnoverHandler } from './top-turnover';
import type { DomesticQuote } from '../../src/domain/markets';

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

describe('domestic top turnover API handler', () => {
  it('returns Naver turnover rows as JSON', async () => {
    const rows: DomesticQuote[] = [
      {
        symbol: '005930.KS',
        name: 'Samsung Electronics',
        priceKrw: 70000,
        previousCloseKrw: 70000,
        turnoverKrw: 1_000_000,
        source: {
          status: 'live',
          updatedAt: '2026-05-10T00:00:00.000Z',
        },
      },
    ];
    const response = createResponse();
    const handler = createDomesticTopTurnoverHandler(async () => rows);

    await handler({}, response);

    expect(response.statusCode).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(JSON.parse(response.body)).toEqual(rows);
  });

  it('returns a 502 JSON error when the upstream fetch fails', async () => {
    const response = createResponse();
    const handler = createDomesticTopTurnoverHandler(async () => {
      throw new Error('upstream failed');
    });

    await handler({}, response);

    expect(response.statusCode).toBe(502);
    expect(JSON.parse(response.body)).toEqual({ error: 'upstream failed' });
  });
});
