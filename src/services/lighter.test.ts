import { describe, expect, it } from 'vitest';
import { parseLighterMarkets } from './lighter';

describe('parseLighterMarkets', () => {
  it('parses named market rows with last price and 24h change', () => {
    const quotes = parseLighterMarkets({
      markets: [
        { symbol: 'SAMSUNG', last_price: '73.25', daily_price_change: '1.2' },
        { symbol: 'SKHYNIX', last_price: 2976.44, change_24h: -0.8 },
      ],
    });

    expect(quotes.SAMSUNG.priceUsd).toBe(73.25);
    expect(quotes.SAMSUNG.change24hPercent).toBe(1.2);
    expect(quotes.SKHYNIX.priceUsd).toBe(2976.44);
    expect(quotes.SKHYNIX.source.status).toBe('live');
  });

  it('parses ticker arrays that use name and mark price fields', () => {
    const quotes = parseLighterMarkets([
      { name: 'HYUNDAI', mark_price: '212.1' },
      { market: 'KRCOMP', index_price: '3840.5' },
    ]);

    expect(quotes.HYUNDAI.priceUsd).toBe(212.1);
    expect(quotes.KRCOMP.priceUsd).toBe(3840.5);
  });
});
