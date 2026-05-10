import type { LighterQuote } from '../domain/markets';

const TRACKED_LIGHTER_SYMBOLS = new Set(['SAMSUNG', 'SKHYNIX', 'HYUNDAI', 'KRCOMP']);

type LighterQuoteMap = Record<string, LighterQuote>;

type UnknownRecord = Record<string, unknown>;

const LIGHTER_ENDPOINT_CANDIDATES = [
  'https://mainnet.zklighter.elliot.ai/api/v1/orderBookDetails',
  'https://api.lighter.xyz/api/v1/orderBookDetails',
  'https://lighter.xyz/api/v1/orderBookDetails',
];

export function parseLighterMarkets(payload: unknown): LighterQuoteMap {
  const rows = extractRows(payload);
  const quotes: LighterQuoteMap = {};

  for (const row of rows) {
    const symbol = readString(row, ['symbol', 'name', 'market', 'ticker'])?.toUpperCase();
    if (!symbol || !TRACKED_LIGHTER_SYMBOLS.has(symbol)) {
      continue;
    }

    const priceUsd = readNumber(row, ['last_price', 'lastPrice', 'mark_price', 'markPrice', 'index_price', 'indexPrice', 'price']);
    if (priceUsd === undefined || priceUsd <= 0) {
      continue;
    }

    quotes[symbol] = {
      symbol,
      priceUsd,
      change24hPercent: readNumber(row, ['daily_price_change', 'change_24h', 'change24h', 'priceChangePercent']),
      source: {
        status: 'live',
        updatedAt: new Date().toISOString(),
      },
    };
  }

  return quotes;
}

export async function fetchLighterQuotes(): Promise<LighterQuoteMap> {
  const errors: string[] = [];

  for (const endpoint of LIGHTER_ENDPOINT_CANDIDATES) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        errors.push(`${endpoint}: ${response.status}`);
        continue;
      }

      const quotes = parseLighterMarkets(await response.json());
      if (Object.keys(quotes).length > 0) {
        return quotes;
      }

      errors.push(`${endpoint}: no tracked Korean markets in payload`);
    } catch (error) {
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`Lighter market discovery failed. ${errors.join(' | ')}`);
}

function extractRows(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of ['markets', 'tickers', 'data', 'order_book_details', 'orderBookDetails']) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  return [];
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function readString(row: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function readNumber(row: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key];
    const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return undefined;
}
