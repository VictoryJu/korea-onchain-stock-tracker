import { describe, expect, it } from 'vitest';
import { parseLighterMarkets } from './lighter';

describe('parseLighterMarkets', () => {
  it('parses named market rows with last price and 24h change', () => {
    const quotes = parseLighterMarkets({
      markets: [
        { symbol: 'SAMSUNGUSD', last_trade_price: '208.33', daily_price_change: '1.2' },
        { symbol: 'SKHYNIXUSD', last_trade_price: 1287.65, change_24h: -0.8 },
      ],
    });

    expect(quotes.SAMSUNGUSD.priceUsd).toBe(208.33);
    expect(quotes.SAMSUNGUSD.change24hPercent).toBe(1.2);
    expect(quotes.SKHYNIXUSD.priceUsd).toBe(1287.65);
    expect(quotes.SKHYNIXUSD.source.status).toBe('live');
  });

  it('parses ticker arrays that use name and mark price fields', () => {
    const quotes = parseLighterMarkets([
      { name: 'HYUNDAIUSD', mark_price: '212.1' },
      { market: 'KRCOMP', index_price: '3840.5' },
    ]);

    expect(quotes.HYUNDAIUSD.priceUsd).toBe(212.1);
    expect(quotes.KRCOMP.priceUsd).toBe(3840.5);
  });
});
