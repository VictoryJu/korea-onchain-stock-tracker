import { describe, expect, it } from 'vitest';
import { getDomesticFallbackQuotes, mergePinnedDomesticQuotes, parseNaverMarketValuePayloads, parseNaverStockBasicPayload } from './koreanEquities';

describe('getDomesticFallbackQuotes', () => {
  it('returns seed Korean market rows marked as fallback data', () => {
    const rows = getDomesticFallbackQuotes();

    expect(rows).toHaveLength(5);
    expect(rows[0].symbol).toBe('005930.KS');
    expect(rows[0].source.status).toBe('fallback');
    expect(rows.some((row) => row.symbol === '000660.KS')).toBe(true);
  });
});

describe('pinned Naver stock payloads', () => {
  it('adds missing Lighter-mapped stocks after the top turnover rows', () => {
    const topRows = parseNaverMarketValuePayloads([
      {
        stocks: [
          {
            itemCode: '005930',
            stockEndType: 'stock',
            stockName: '삼성전자',
            closePriceRaw: '268500',
            accumulatedTradingValueRaw: '6809050000000',
            localTradedAt: '2026-05-08T16:10:22+09:00',
          },
        ],
      },
    ]);
    const skHynix = parseNaverStockBasicPayload({
      itemCode: '000660',
      stockEndType: 'stock',
      stockName: 'SK하이닉스',
      closePrice: '1,686,000',
      localTradedAt: '2026-05-08T16:10:20+09:00',
      overMarketPriceInfo: {
        overPrice: '1,681,000',
        localTradedAt: '2026-05-08T20:00:00+09:00',
      },
      stockExchangeType: { name: 'KOSPI' },
    });

    const merged = mergePinnedDomesticQuotes(topRows, [skHynix]);

    expect(merged.map((row) => row.symbol)).toEqual(['005930.KS', '000660.KS']);
    expect(merged[1].priceKrw).toBe(1681000);
    expect(merged[1].source.message).toBe('Pinned Naver after-market reference');
  });
});

describe('parseNaverMarketValuePayloads', () => {
  it('sorts KOSPI and KOSDAQ rows by accumulated trading value and maps them to domestic quotes', () => {
    const rows = parseNaverMarketValuePayloads([
      {
        stocks: [
          {
            itemCode: '005930',
            stockEndType: 'stock',
            stockName: '삼성전자',
            closePriceRaw: '268500',
            accumulatedTradingValueRaw: '6809050000000',
            localTradedAt: '2026-05-08T16:10:22+09:00',
          },
          {
            itemCode: '000660',
            stockEndType: 'stock',
            stockName: 'SK하이닉스',
            closePriceRaw: '1686000',
            accumulatedTradingValueRaw: '52626000000',
            localTradedAt: '2026-05-08T16:10:20+09:00',
          },
          {
            itemCode: '069500',
            stockEndType: 'etf',
            stockName: 'KODEX 200',
            closePriceRaw: '115810',
            accumulatedTradingValueRaw: '9000000000000',
            localTradedAt: '2026-05-08T16:10:22+09:00',
          },
        ],
      },
      {
        stocks: [
          {
            itemCode: '247540',
            stockEndType: 'stock',
            stockName: '에코프로비엠',
            closePriceRaw: '184000',
            accumulatedTradingValueRaw: '870000000000',
            localTradedAt: '2026-05-08T16:10:21+09:00',
          },
        ],
      },
    ]);

    expect(rows.map((row) => row.symbol)).toEqual(['005930.KS', '247540.KQ', '000660.KS']);
    expect(rows[0].priceKrw).toBe(268500);
    expect(rows[0].turnoverKrw).toBe(6809050000000);
    expect(rows[0].source.status).toBe('live');
  });
});
