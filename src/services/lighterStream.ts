import type { LighterQuote } from '../domain/markets';

const LIGHTER_STREAM_URL = 'wss://mainnet.zklighter.elliot.ai/stream';
const TRACKED_LIGHTER_SYMBOLS = new Set(['SAMSUNGUSD', 'SKHYNIXUSD', 'HYUNDAIUSD', 'KRCOMP']);

type UnknownRecord = Record<string, unknown>;

export type LighterQuoteMap = Record<string, LighterQuote>;

export type LighterStreamStatus = 'connecting' | 'live' | 'fallback' | 'closed';

export type LighterMarketStatsStreamOptions = {
  onQuotes(quotes: LighterQuoteMap): void;
  onStatus?(status: LighterStreamStatus): void;
};

export function createLighterMarketStatsStream(options: LighterMarketStatsStreamOptions): () => void {
  if (typeof WebSocket === 'undefined') {
    options.onStatus?.('fallback');
    return () => undefined;
  }

  options.onStatus?.('connecting');

  const socket = new WebSocket(LIGHTER_STREAM_URL);

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'subscribe', channel: 'market_stats/all' }));
  });

  socket.addEventListener('message', (event) => {
    try {
      const quotes = parseLighterMarketStatsMessage(JSON.parse(String(event.data)));
      if (Object.keys(quotes).length === 0) {
        return;
      }

      options.onStatus?.('live');
      options.onQuotes(quotes);
    } catch {
      options.onStatus?.('fallback');
    }
  });

  socket.addEventListener('error', () => {
    options.onStatus?.('fallback');
  });

  socket.addEventListener('close', () => {
    options.onStatus?.('closed');
  });

  return () => {
    socket.close();
  };
}

export function parseLighterMarketStatsMessage(payload: unknown, updatedAt = new Date().toISOString()): LighterQuoteMap {
  if (!isRecord(payload)) {
    return {};
  }

  const marketStats = payload.market_stats;
  const statsRows = Array.isArray(marketStats)
    ? marketStats
    : isRecord(marketStats) && typeof marketStats.symbol === 'string'
      ? [marketStats]
      : isRecord(marketStats)
        ? Object.values(marketStats)
        : [];
  const quotes: LighterQuoteMap = {};

  for (const row of statsRows) {
    if (!isRecord(row)) {
      continue;
    }

    const symbol = readString(row.symbol)?.toUpperCase();
    if (!symbol || !TRACKED_LIGHTER_SYMBOLS.has(symbol)) {
      continue;
    }

    const priceUsd =
      readNumber(row.last_trade_price) ??
      readNumber(row.mark_price) ??
      readNumber(row.index_price) ??
      readNumber(row.mid_price);
    if (priceUsd === undefined || priceUsd <= 0) {
      continue;
    }

    quotes[symbol] = {
      symbol,
      priceUsd,
      change24hPercent: readNumber(row.daily_price_change),
      source: {
        status: 'live',
        updatedAt,
        message: 'Lighter WebSocket market_stats',
      },
    };
  }

  return quotes;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(numberValue) ? numberValue : undefined;
}
