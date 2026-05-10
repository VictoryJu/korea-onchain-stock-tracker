import type { DomesticQuote } from '../domain/markets';

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
  return getDomesticFallbackQuotes();
}
