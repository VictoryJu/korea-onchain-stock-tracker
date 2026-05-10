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
  const response = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-USDT');
  if (!response.ok) {
    throw new Error(`Upbit request failed with ${response.status}`);
  }

  return parseUpbitTicker(await response.json());
}
