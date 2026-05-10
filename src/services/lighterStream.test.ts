import { describe, expect, it } from 'vitest';
import { parseLighterMarketStatsMessage } from './lighterStream';

describe('parseLighterMarketStatsMessage', () => {
  it('parses Lighter market_stats/all snapshots into quote maps', () => {
    const quotes = parseLighterMarketStatsMessage(
      {
        channel: 'market_stats:all',
        market_stats: {
          160: { symbol: 'HYUNDAIUSD', market_id: 160, last_trade_price: '438.280', daily_price_change: 0.48 },
          161: { symbol: 'SKHYNIXUSD', market_id: 161, last_trade_price: '1290.000', daily_price_change: 2.38 },
          999: { symbol: 'BTC', market_id: 999, last_trade_price: '80000' },
        },
        type: 'update/market_stats',
      },
      '2026-05-10T00:00:00.000Z',
    );

    expect(quotes.HYUNDAIUSD.priceUsd).toBe(438.28);
    expect(quotes.HYUNDAIUSD.change24hPercent).toBe(0.48);
    expect(quotes.SKHYNIXUSD.priceUsd).toBe(1290);
    expect(quotes.SKHYNIXUSD.source).toEqual({
      status: 'live',
      updatedAt: '2026-05-10T00:00:00.000Z',
      message: 'Lighter WebSocket market_stats',
    });
    expect(quotes.BTC).toBeUndefined();
  });

  it('parses single-market updates and falls back to mark price', () => {
    const quotes = parseLighterMarketStatsMessage({
      channel: 'market_stats:162',
      market_stats: {
        symbol: 'SAMSUNGUSD',
        market_id: 162,
        mark_price: '208.434',
      },
      type: 'update/market_stats',
    });

    expect(quotes.SAMSUNGUSD.priceUsd).toBe(208.434);
  });
});
