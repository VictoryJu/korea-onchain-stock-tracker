import type { DomesticQuote } from '../domain/markets';

type NaverMarket = 'KOSPI' | 'KOSDAQ';

type NaverStockRow = {
  itemCode?: unknown;
  stockEndType?: unknown;
  stockName?: unknown;
  closePriceRaw?: unknown;
  accumulatedTradingValueRaw?: unknown;
  localTradedAt?: unknown;
  overMarketPriceInfo?: {
    overPriceRaw?: unknown;
    overPrice?: unknown;
    localTradedAt?: unknown;
  };
  stockExchangeType?: {
    name?: unknown;
  };
  closePrice?: unknown;
};

type NaverPayload = {
  stocks?: unknown;
};

export function getDomesticFallbackQuotes(): DomesticQuote[] {
  const updatedAt = new Date().toISOString();

  return [
    {
      symbol: '005930.KS',
      name: 'Samsung Electronics',
      priceKrw: 73500,
      previousCloseKrw: 73500,
      turnoverKrw: 1_600_000_000_000,
      source: {
        status: 'fallback',
        updatedAt,
        message: 'Seed domestic reference until a Korean market data provider is connected.',
      },
    },
    {
      symbol: '000660.KS',
      name: 'SK Hynix',
      priceKrw: 292000,
      previousCloseKrw: 292000,
      turnoverKrw: 1_200_000_000_000,
      source: {
        status: 'fallback',
        updatedAt,
        message: 'Seed domestic reference until a Korean market data provider is connected.',
      },
    },
    {
      symbol: '005380.KS',
      name: 'Hyundai Motor',
      priceKrw: 214000,
      previousCloseKrw: 214000,
      turnoverKrw: 420_000_000_000,
      source: {
        status: 'fallback',
        updatedAt,
        message: 'Seed domestic reference until a Korean market data provider is connected.',
      },
    },
    {
      symbol: '035420.KS',
      name: 'NAVER',
      priceKrw: 186000,
      previousCloseKrw: 186000,
      turnoverKrw: 310_000_000_000,
      source: {
        status: 'fallback',
        updatedAt,
        message: 'No mapped onchain market yet.',
      },
    },
    {
      symbol: '035720.KS',
      name: 'Kakao',
      priceKrw: 58700,
      previousCloseKrw: 58700,
      turnoverKrw: 280_000_000_000,
      source: {
        status: 'fallback',
        updatedAt,
        message: 'No mapped onchain market yet.',
      },
    },
  ];
}

export async function fetchDomesticQuotes(): Promise<DomesticQuote[]> {
  try {
    const response = await fetch('/api/domestic/top-turnover');
    if (!response.ok) {
      throw new Error(`Domestic API failed with ${response.status}`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Domestic API returned no rows');
    }

    return rows as DomesticQuote[];
  } catch {
    return getDomesticFallbackQuotes();
  }
}

export function parseNaverMarketValuePayloads(payloads: Array<{ market?: NaverMarket; payload: NaverPayload } | NaverPayload>): DomesticQuote[] {
  const rows = payloads.flatMap((entry, index) => {
    const payload = 'payload' in entry ? entry.payload : entry;
    const market = 'market' in entry && entry.market ? entry.market : index === 0 ? 'KOSPI' : 'KOSDAQ';
    const stocks = Array.isArray(payload.stocks) ? payload.stocks : [];

    return stocks
      .filter(isNaverStockRow)
      .map((stock) => toDomesticQuote(stock, market))
      .filter((quote): quote is DomesticQuote => quote !== undefined);
  });

  return rows.sort((a, b) => (b.turnoverKrw ?? 0) - (a.turnoverKrw ?? 0)).slice(0, 5);
}

export function parseNaverStockBasicPayload(payload: NaverStockRow): DomesticQuote | undefined {
  const exchangeName = readString(payload.stockExchangeType?.name);
  return toDomesticQuote(payload, exchangeName === 'KOSDAQ' ? 'KOSDAQ' : 'KOSPI', true);
}

export function mergePinnedDomesticQuotes(topRows: DomesticQuote[], pinnedRows: Array<DomesticQuote | undefined>): DomesticQuote[] {
  const seen = new Set(topRows.map((row) => row.symbol));
  const merged = [...topRows];

  for (const row of pinnedRows) {
    if (!row || seen.has(row.symbol)) {
      continue;
    }

    merged.push(row);
    seen.add(row.symbol);
  }

  return merged;
}

export async function fetchNaverTopTurnoverQuotes(fetcher: typeof fetch = fetch): Promise<DomesticQuote[]> {
  const payloads = await Promise.all(
    (['KOSPI', 'KOSDAQ'] as const).flatMap((market) => {
      return [1, 2, 3].map(async (page) => {
        const response = await fetcher(
          `https://m.stock.naver.com/api/stocks/marketValue/${market}?page=${page}&pageSize=100`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Naver ${market} page ${page} failed with ${response.status}`);
        }

        return {
          market,
          payload: (await response.json()) as NaverPayload,
        };
      });
    }),
  );

  const quotes = parseNaverMarketValuePayloads(payloads);
  const pinnedQuotes = await Promise.all(
    ['005930', '000660', '005380'].map(async (code) => {
      try {
        const response = await fetcher(`https://m.stock.naver.com/api/stock/${code}/basic`, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          return undefined;
        }

        return parseNaverStockBasicPayload((await response.json()) as NaverStockRow);
      } catch {
        return undefined;
      }
    }),
  );
  const mergedQuotes = mergePinnedDomesticQuotes(quotes, pinnedQuotes);
  if (mergedQuotes.length === 0) {
    throw new Error('Naver returned no domestic turnover rows');
  }

  return mergedQuotes;
}

function toDomesticQuote(stock: NaverStockRow, market: NaverMarket, pinned = false): DomesticQuote | undefined {
  if (stock.stockEndType !== undefined && stock.stockEndType !== 'stock') {
    return undefined;
  }

  const code = readString(stock.itemCode);
  const name = readString(stock.stockName);
  const closePrice = readNumber(stock.closePriceRaw) ?? readNumber(stock.closePrice);
  const overPrice = readNumber(stock.overMarketPriceInfo?.overPriceRaw) ?? readNumber(stock.overMarketPriceInfo?.overPrice);
  const turnover = readNumber(stock.accumulatedTradingValueRaw) ?? 0;
  const tradedAt = readString(stock.overMarketPriceInfo?.localTradedAt) ?? readString(stock.localTradedAt);

  if (!code || !name || closePrice === undefined || turnover === undefined) {
    return undefined;
  }

  return {
    symbol: `${code}.${market === 'KOSPI' ? 'KS' : 'KQ'}`,
    name,
    priceKrw: overPrice ?? closePrice,
    previousCloseKrw: closePrice,
    turnoverKrw: turnover,
    source: {
      status: 'live',
      updatedAt: tradedAt ? new Date(tradedAt).toISOString() : new Date().toISOString(),
      message: pinned
        ? overPrice
          ? 'Pinned Naver after-market reference'
          : 'Pinned Naver market reference'
        : overPrice
          ? 'Naver domestic after-market reference'
          : 'Naver domestic market reference',
    },
  };
}

function isNaverStockRow(value: unknown): value is NaverStockRow {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replaceAll(',', '')) : Number.NaN;
  return Number.isFinite(numberValue) ? numberValue : undefined;
}
