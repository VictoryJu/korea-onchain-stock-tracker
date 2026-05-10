type ResponseLike = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: string): void;
};

type UpbitTickerPayload = {
  market?: unknown;
  trade_price?: unknown;
  timestamp?: unknown;
};

type UpbitQuote = {
  usdtKrw: number;
  source: {
    status: 'live';
    updatedAt: string;
    message: string;
  };
};

type CacheEntry = {
  expiresAt: number;
  body: string;
};

export function createUpbitUsdtKrwHandler(fetchTicker = fetchUpbitTicker) {
  let cache: CacheEntry | undefined;

  return async function handler(_request: unknown, response: ResponseLike) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
      if (cache && cache.expiresAt > Date.now()) {
        response.end(cache.body);
        return;
      }

      const body = JSON.stringify(parseUpbitTicker(await fetchTicker()));
      cache = {
        body,
        expiresAt: Date.now() + 10_000,
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

export default createUpbitUsdtKrwHandler();

async function fetchUpbitTicker(fetcher: typeof fetch = fetch): Promise<unknown> {
  const response = await fetcher('https://api.upbit.com/v1/ticker?markets=KRW-USDT', {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Upbit request failed with ${response.status}`);
  }

  return response.json();
}

function parseUpbitTicker(payload: unknown): UpbitQuote {
  const rows = Array.isArray(payload) ? payload : [];
  const ticker = rows.find((row): row is UpbitTickerPayload => {
    return typeof row === 'object' && row !== null && (row as UpbitTickerPayload).market === 'KRW-USDT';
  });

  const tradePrice = Number(ticker?.trade_price);
  if (!Number.isFinite(tradePrice) || tradePrice <= 0) {
    throw new Error('Upbit KRW-USDT ticker payload did not include a valid trade_price');
  }

  const timestamp = Number(ticker?.timestamp);

  return {
    usdtKrw: tradePrice,
    source: {
      status: 'live',
      updatedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString(),
      message: 'Upbit KRW-USDT ticker via server proxy',
    },
  };
}
