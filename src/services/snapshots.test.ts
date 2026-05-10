import { describe, expect, it } from 'vitest';
import type { DomesticQuote, LighterQuote, UpbitQuote } from '../domain/markets';
import { composeDashboardRows } from './snapshots';

describe('composeDashboardRows', () => {
  it('adds Lighter and converted KRW values to mapped Korean stocks', () => {
    const domestic: DomesticQuote[] = [
      {
        symbol: '005930.KS',
        name: 'Samsung Electronics',
        priceKrw: 70000,
        previousCloseKrw: 70000,
        source: { status: 'live' },
      },
    ];
    const lighter: Record<string, LighterQuote> = {
      SAMSUNG: {
        symbol: 'SAMSUNG',
        priceUsd: 52,
        change24hPercent: 1.3,
        source: { status: 'live' },
      },
    };
    const upbit: UpbitQuote = {
      usdtKrw: 1400,
      source: { status: 'live' },
    };

    const [row] = composeDashboardRows({ domestic, lighter, upbit });

    expect(row.convertedPriceKrw).toBe(72800);
    expect(row.gapPercent).toBe(4);
    expect(row.onchainState.status).toBe('live');
  });

  it('marks unmapped stocks as having no onchain market', () => {
    const [row] = composeDashboardRows({
      domestic: [
        {
          symbol: '035420.KS',
          name: 'NAVER',
          priceKrw: 186000,
          previousCloseKrw: 186000,
          source: { status: 'live' },
        },
      ],
      lighter: {},
      upbit: { usdtKrw: 1400, source: { status: 'live' } },
    });

    expect(row.convertedPriceKrw).toBeUndefined();
    expect(row.onchainState.status).toBe('unavailable');
    expect(row.onchainState.message).toBe('No mapped Lighter market');
  });
});
