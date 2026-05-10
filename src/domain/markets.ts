export type SourceStatus = 'live' | 'stale' | 'fallback' | 'unavailable';

export type SourceState = {
  status: SourceStatus;
  updatedAt?: string;
  message?: string;
};

export type TrackedStock = {
  symbol: string;
  name: string;
  shortName: string;
  exchange: 'KRX' | 'Lighter';
  domesticSymbol?: string;
  lighterSymbol?: string;
  sector?: string;
};

export type DomesticQuote = {
  symbol: string;
  name: string;
  priceKrw: number;
  previousCloseKrw: number;
  turnoverKrw?: number;
  source: SourceState;
};

export type LighterQuote = {
  symbol: string;
  priceUsd: number;
  change24hPercent?: number;
  source: SourceState;
};

export type UpbitQuote = {
  usdtKrw: number;
  source: SourceState;
};

export type DashboardRow = {
  stock: TrackedStock;
  domestic?: DomesticQuote;
  lighter?: LighterQuote;
  convertedPriceKrw?: number;
  gapPercent?: number;
  onchainState: SourceState;
};

export const trackedStocks: TrackedStock[] = [
  {
    symbol: '005930.KS',
    domesticSymbol: '005930',
    lighterSymbol: 'SAMSUNGUSD',
    name: 'Samsung Electronics',
    shortName: 'Samsung',
    exchange: 'KRX',
    sector: 'Semiconductors',
  },
  {
    symbol: '000660.KS',
    domesticSymbol: '000660',
    lighterSymbol: 'SKHYNIXUSD',
    name: 'SK Hynix',
    shortName: 'SK Hynix',
    exchange: 'KRX',
    sector: 'Semiconductors',
  },
  {
    symbol: '005380.KS',
    domesticSymbol: '005380',
    lighterSymbol: 'HYUNDAIUSD',
    name: 'Hyundai Motor',
    shortName: 'Hyundai',
    exchange: 'KRX',
    sector: 'Autos',
  },
  {
    symbol: 'KRCOMP',
    lighterSymbol: 'KRCOMP',
    name: 'Korean Composite Index',
    shortName: 'Korea Index',
    exchange: 'Lighter',
  },
];

export function convertUsdToKrw(priceUsd: number, usdtKrw: number): number {
  return Math.round(priceUsd * usdtKrw);
}

export function calculateGapPercent(convertedOnchainKrw: number, domesticReferenceKrw: number): number {
  if (domesticReferenceKrw <= 0) {
    return 0;
  }

  return Number((((convertedOnchainKrw - domesticReferenceKrw) / domesticReferenceKrw) * 100).toFixed(2));
}
