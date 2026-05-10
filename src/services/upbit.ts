import type { UpbitQuote } from '../domain/markets';

type UpbitTickerPayload = {
  market?: unknown;
  trade_price?: unknown;
  timestamp?: unknown;
};

export function parseUpbitTicker(payload: unknown): UpbitQuote {
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
    },
  };
}

export async function fetchUpbitUsdtKrw(): Promise<UpbitQuote> {
  const response = await fetch('/api/upbit/usdt-krw');
  if (!response.ok) {
    throw new Error(`Upbit request failed with ${response.status}`);
  }

  return parseUpbitProxyPayload(await response.json());
}

function parseUpbitProxyPayload(payload: unknown): UpbitQuote {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Upbit proxy payload was not an object');
  }

  const quote = payload as Partial<UpbitQuote>;
  const usdtKrw = Number(quote.usdtKrw);
  if (!Number.isFinite(usdtKrw) || usdtKrw <= 0) {
    throw new Error('Upbit proxy payload did not include a valid usdtKrw value');
  }

  return {
    usdtKrw,
    source: quote.source ?? {
      status: 'live',
      updatedAt: new Date().toISOString(),
    },
  };
}
