type ResponseLike = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: string): void;
};

type SourceState = {
  status: 'live' | 'stale' | 'fallback' | 'unavailable';
  updatedAt?: string;
  message?: string;
};

type DomesticQuote = {
  symbol: string;
  name: string;
  priceKrw: number;
  previousCloseKrw: number;
  turnoverKrw?: number;
  source: SourceState;
};

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

type CacheEntry = {
  expiresAt: number;
  body: string;
};

export function createDomesticTopTurnoverHandler(fetchQuotes = fetchNaverTopTurnoverQuotes) {
  let domesticCache: CacheEntry | undefined;

  return async function handler(_request: unknown, response: ResponseLike) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
      if (domesticCache && domesticCache.expiresAt > Date.now()) {
        response.end(domesticCache.body);
        return;
      }

      const body = JSON.stringify(await fetchQuotes());
      domesticCache = {
        body,
        expiresAt: Date.now() + 30_000,
      };
      response.end(body);
    } catch (error) {
      response.statusCode = 502;
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };
}

export default createDomesticTopTurnoverHandler();

async function fetchNaverTopTurnoverQuotes(fetcher: typeof fetch = fetch): Promise<DomesticQuote[]> {
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

function parseNaverMarketValuePayloads(payloads: Array<{ market: NaverMarket; payload: NaverPayload }>): DomesticQuote[] {
  const rows = payloads.flatMap((entry) => {
    const stocks = Array.isArray(entry.payload.stocks) ? entry.payload.stocks : [];

    return stocks
      .filter(isNaverStockRow)
      .map((stock) => toDomesticQuote(stock, entry.market))
      .filter((quote): quote is DomesticQuote => quote !== undefined);
  });

  return rows.sort((a, b) => (b.turnoverKrw ?? 0) - (a.turnoverKrw ?? 0)).slice(0, 5);
}

function parseNaverStockBasicPayload(payload: NaverStockRow): DomesticQuote | undefined {
  const exchangeName = readString(payload.stockExchangeType?.name);
  return toDomesticQuote(payload, exchangeName === 'KOSDAQ' ? 'KOSDAQ' : 'KOSPI', true);
}

function mergePinnedDomesticQuotes(topRows: DomesticQuote[], pinnedRows: Array<DomesticQuote | undefined>): DomesticQuote[] {
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

  if (!code || !name || closePrice === undefined) {
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
