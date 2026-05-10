import { Activity, AlertCircle, RefreshCw, Wifi } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardRow, DomesticQuote, LighterQuote } from './domain/markets';
import { getDomesticFallbackQuotes } from './services/koreanEquities';
import { createLighterMarketStatsStream, type LighterStreamStatus } from './services/lighterStream';
import { composeDashboardRows, fetchDashboardSnapshot, type DashboardSnapshot } from './services/snapshots';

const POLL_INTERVAL_MS = 10_000;

const initialSnapshot: DashboardSnapshot = {
  rows: composeDashboardRows({
    domestic: getDomesticFallbackQuotes(),
    lighter: {},
    lighterError: 'Connecting to Lighter',
  }),
  lighter: {},
  sourceMessages: ['Connecting to Lighter, Upbit, and domestic market feeds.'],
  updatedAt: new Date().toISOString(),
};

export default function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [selectedSymbol, setSelectedSymbol] = useState('005930.KS');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lighterStreamStatus, setLighterStreamStatus] = useState<LighterStreamStatus>('connecting');
  const lighterQuotesRef = useRef<Record<string, LighterQuote>>(initialSnapshot.lighter);

  useEffect(() => {
    let cancelled = false;

    async function refresh(fetchLighter: boolean) {
      setIsRefreshing(true);
      try {
        const nextSnapshot = await fetchDashboardSnapshot({
          fetchLighter,
          lighter: lighterQuotesRef.current,
        });
        if (!cancelled) {
          lighterQuotesRef.current = nextSnapshot.lighter;
          setSnapshot(nextSnapshot);
          setSelectedSymbol((current) => {
            const nextVisibleRows = getLighterMappedRows(nextSnapshot.rows);
            return nextVisibleRows.some((row) => row.stock.symbol === current)
              ? current
              : nextVisibleRows[0]?.stock.symbol ?? current;
          });
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    void refresh(true);
    const timer = window.setInterval(() => refresh(false), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    return createLighterMarketStatsStream({
      onStatus: setLighterStreamStatus,
      onQuotes: (quotes) => {
        const nextLighter = {
          ...lighterQuotesRef.current,
          ...quotes,
        };
        lighterQuotesRef.current = nextLighter;
        setSnapshot((current) => {
          const domestic = getDomesticRows(current.rows);
          return {
            ...current,
            rows: composeDashboardRows({
              domestic,
              lighter: nextLighter,
              upbit: current.upbit,
            }),
            lighter: nextLighter,
            sourceMessages: current.sourceMessages.filter((message) => !message.startsWith('Lighter data failed:')),
            updatedAt: new Date().toISOString(),
          };
        });
      },
    });
  }, []);

  const visibleRows = useMemo(() => getLighterMappedRows(snapshot.rows), [snapshot.rows]);
  const selectedRow = useMemo(() => {
    return visibleRows.find((row) => row.stock.symbol === selectedSymbol) ?? visibleRows[0];
  }, [selectedSymbol, visibleRows]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">K</div>
        <div>
          <h1>Korea Onchain Stock Tracker</h1>
          <p>Domestic close anchored. Lighter Perp keeps moving. USDT/KRW converts it back to won.</p>
        </div>
        <div className="topbar-status" title="Data refresh state">
          <RefreshCw size={16} className={isRefreshing ? 'spin' : undefined} />
          <span>{isRefreshing ? 'Refreshing' : 'Live board'}</span>
        </div>
      </header>

      <section className="status-strip" aria-label="Market data status">
        <Metric label="USDT/KRW" value={snapshot.upbit ? formatKrw(snapshot.upbit.usdtKrw) : 'Connecting'} />
        <Metric label="Lighter Perp" value={countLiveOnchainRows(visibleRows).toString()} helper={`${visibleRows.length} mapped assets`} />
        <Metric label="Lighter Feed" value={formatStreamStatus(lighterStreamStatus)} helper={`Domestic/FX 10s · ${formatTime(snapshot.updatedAt)}`} />
      </section>

      {snapshot.sourceMessages.length > 0 && (
        <section className="notice-bar" aria-label="Source messages">
          <AlertCircle size={18} />
          <span>{snapshot.sourceMessages.join(' ')}</span>
        </section>
      )}

      <section className="dashboard-grid">
        <div className="market-panel">
          <div className="panel-heading">
            <div>
              <h2>Lighter-Mapped Korean Stocks</h2>
              <p>Only domestic names with an active Lighter perp mapping are shown.</p>
            </div>
            <Wifi size={18} />
          </div>

          <div className="market-card-grid" aria-label="Lighter mapped stock cards">
            {visibleRows.map((row) => (
              <button
                className={`market-card ${selectedRow?.stock.symbol === row.stock.symbol ? 'selected' : ''}`}
                key={row.stock.symbol}
                onClick={() => setSelectedSymbol(row.stock.symbol)}
                type="button"
              >
                <span className="card-topline">
                  <span className="asset-cell">
                    <strong>{row.stock.shortName}</strong>
                    <small>{row.stock.symbol}</small>
                  </span>
                  <span className={`state-pill ${row.onchainState.status}`}>Lighter Perp</span>
                </span>

                <span className="card-price-block">
                  <small>USDT/KRW converted</small>
                  <strong>{row.convertedPriceKrw ? formatKrw(row.convertedPriceKrw) : 'Connecting'}</strong>
                </span>

                <span className="card-metrics">
                  <span>
                    <small>Domestic</small>
                    <strong>{row.domestic ? formatKrw(row.domestic.priceKrw) : '-'}</strong>
                  </span>
                  <span>
                    <small>Lighter USD</small>
                    <strong>{row.lighter ? formatUsd(row.lighter.priceUsd) : '-'}</strong>
                  </span>
                </span>

                <span className="card-metrics">
                  <span className="card-change-metric">
                    <small>Gap</small>
                    <ChangeCell value={row.gapPercent} />
                  </span>
                  <span className="card-change-metric">
                    <small>24h</small>
                    <ChangeCell value={row.lighter?.change24hPercent} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedRow && <DetailPanel row={selectedRow} />}
      </section>
    </main>
  );
}

function DetailPanel({ row }: { row: DashboardRow }) {
  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div>
          <span className="eyebrow">{row.stock.lighterSymbol ? 'Lighter Perp' : 'Domestic only'}</span>
          <h2>{row.stock.name}</h2>
          <p>{row.stock.symbol}</p>
        </div>
        <Activity size={22} />
      </div>

      <div className="price-stack">
        <span>Converted onchain price</span>
        <strong>{row.convertedPriceKrw ? formatKrw(row.convertedPriceKrw) : 'Unavailable'}</strong>
        <ChangeCell value={row.gapPercent} suffix=" vs domestic" />
      </div>

      <div className="detail-chart" aria-hidden="true">
        <div style={{ height: `${chartHeight(row.gapPercent)}%` }} />
      </div>

      <dl className="detail-list">
        <div>
          <dt>Domestic reference</dt>
          <dd>{row.domestic ? formatKrw(row.domestic.priceKrw) : '-'}</dd>
        </div>
        <div>
          <dt>Lighter symbol</dt>
          <dd>{row.stock.lighterSymbol ?? 'No mapped market'}</dd>
        </div>
        <div>
          <dt>Source state</dt>
          <dd>{row.onchainState.status}</dd>
        </div>
      </dl>
    </aside>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </div>
  );
}

function ChangeCell({ value, suffix = '%' }: { value?: number; suffix?: string }) {
  if (value === undefined) {
    return <span className="muted">-</span>;
  }

  const direction = value >= 0 ? 'up' : 'down';
  return <span className={direction}>{`${value >= 0 ? '+' : ''}${value.toFixed(2)}${suffix}`}</span>;
}

function countLiveOnchainRows(rows: DashboardRow[]): number {
  return rows.filter((row) => row.onchainState.status === 'live').length;
}

function getLighterMappedRows(rows: DashboardRow[]): DashboardRow[] {
  return rows.filter((row) => Boolean(row.stock.lighterSymbol));
}

function getDomesticRows(rows: DashboardRow[]): DomesticQuote[] {
  return rows.map((row) => row.domestic).filter((domestic): domestic is DomesticQuote => Boolean(domestic));
}

function formatStreamStatus(status: LighterStreamStatus): string {
  if (status === 'live') {
    return 'Socket';
  }

  if (status === 'fallback') {
    return 'REST fallback';
  }

  return status === 'closed' ? 'Closed' : 'Connecting';
}

function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: value > 1000 ? 0 : 2,
  }).format(value);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function chartHeight(value?: number): number {
  if (value === undefined) {
    return 24;
  }

  return Math.min(92, Math.max(12, 42 + value * 5));
}
