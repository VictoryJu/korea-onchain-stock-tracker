import {
  calculateGapPercent,
  convertUsdToKrw,
  trackedStocks,
  type DashboardRow,
  type DomesticQuote,
  type LighterQuote,
  type SourceState,
  type TrackedStock,
  type UpbitQuote,
} from '../domain/markets';
import { fetchDomesticQuotes } from './koreanEquities';
import { fetchLighterQuotes } from './lighter';
import { fetchUpbitUsdtKrw } from './upbit';

export type SnapshotInput = {
  domestic: DomesticQuote[];
  lighter: Record<string, LighterQuote>;
  upbit?: UpbitQuote;
  lighterError?: string;
  upbitError?: string;
};

export type DashboardSnapshot = {
  rows: DashboardRow[];
  upbit?: UpbitQuote;
  sourceMessages: string[];
  updatedAt: string;
};

export function composeDashboardRows(input: SnapshotInput): DashboardRow[] {
  return input.domestic.map((domestic) => {
    const stock = findTrackedStock(domestic);
    const lighter = stock.lighterSymbol ? input.lighter[stock.lighterSymbol] : undefined;

    if (!stock.lighterSymbol) {
      return {
        stock,
        domestic,
        onchainState: {
          status: 'unavailable',
          message: 'No mapped Lighter market',
        },
      };
    }

    if (!lighter) {
      return {
        stock,
        domestic,
        onchainState: unavailableOnchainState(input.lighterError),
      };
    }

    if (!input.upbit) {
      return {
        stock,
        domestic,
        lighter,
        onchainState: unavailableOnchainState(input.upbitError ?? 'USDT/KRW conversion unavailable'),
      };
    }

    const convertedPriceKrw = convertUsdToKrw(lighter.priceUsd, input.upbit.usdtKrw);

    return {
      stock,
      domestic,
      lighter,
      convertedPriceKrw,
      gapPercent: calculateGapPercent(convertedPriceKrw, domestic.priceKrw),
      onchainState: lighter.source,
    };
  });
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [domesticResult, lighterResult, upbitResult] = await Promise.allSettled([
    fetchDomesticQuotes(),
    fetchLighterQuotes(),
    fetchUpbitUsdtKrw(),
  ]);

  const domestic =
    domesticResult.status === 'fulfilled'
      ? domesticResult.value
      : [];
  const lighter =
    lighterResult.status === 'fulfilled'
      ? lighterResult.value
      : {};
  const upbit =
    upbitResult.status === 'fulfilled'
      ? upbitResult.value
      : undefined;

  const sourceMessages = [
    domesticResult.status === 'rejected' ? `Domestic data failed: ${formatError(domesticResult.reason)}` : undefined,
    lighterResult.status === 'rejected' ? `Lighter data failed: ${formatError(lighterResult.reason)}` : undefined,
    upbitResult.status === 'rejected' ? `Upbit data failed: ${formatError(upbitResult.reason)}` : undefined,
  ].filter((message): message is string => Boolean(message));

  return {
    rows: composeDashboardRows({
      domestic,
      lighter,
      upbit,
      lighterError: lighterResult.status === 'rejected' ? formatError(lighterResult.reason) : undefined,
      upbitError: upbitResult.status === 'rejected' ? formatError(upbitResult.reason) : undefined,
    }),
    upbit,
    sourceMessages,
    updatedAt: new Date().toISOString(),
  };
}

function findTrackedStock(domestic: DomesticQuote): TrackedStock {
  return (
    trackedStocks.find((stock) => stock.symbol === domestic.symbol || stock.domesticSymbol === domestic.symbol.replace('.KS', '')) ?? {
      symbol: domestic.symbol,
      domesticSymbol: domestic.symbol.replace('.KS', ''),
      name: domestic.name,
      shortName: domestic.name,
      exchange: 'KRX',
    }
  );
}

function unavailableOnchainState(message?: string): SourceState {
  return {
    status: 'unavailable',
    message: message ?? 'Lighter market unavailable',
  };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
