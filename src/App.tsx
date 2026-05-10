import { Activity, AlertCircle, RefreshCw, Wifi } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DashboardRow } from './domain/markets';
import { getDomesticFallbackQuotes } from './services/koreanEquities';
import { fetchDashboardSnapshot, type DashboardSnapshot } from './services/snapshots';

const POLL_INTERVAL_MS = 10_000;

const initialSnapshot: DashboardSnapshot = {
  rows: getDomesticFallbackQuotes().map((domestic) => ({
    stock: {
      symbol: domestic.symbol,
      domesticSymbol: domestic.symbol.replace('.KS', ''),
      name: domestic.name,
      shortName: domestic.name,
      exchange: 'KRX',
    },
    domestic,
    onchainState: {
      status: 'unavailable',
      message: 'Connecting to Lighter',
    },
  })),
  sourceMessages: ['Connecting to Lighter, Upbit, and domestic market feeds.'],
  updatedAt: new Date().toISOString(),
};

export default function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [selectedSymbol, setSelectedSymbol] = useState('005930.KS');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      setIsRefreshing(true);
      try {
        const nextSnapshot = await fetchDashboardSnapshot();
        if (!cancelled) {
          setSnapshot(nextSnapshot);
          setSelectedSymbol((current) => {
            return nextSnapshot.rows.some((row) => row.stock.symbol === current)
              ? current
              : nextSnapshot.rows[0]?.stock.symbol ?? current;
          });
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const selectedRow = useMemo(() => {
    return snapshot.rows.find((row) => row.stock.symbol === selectedSymbol) ?? snapshot.rows[0];
  }, [selectedSymbol, snapshot.rows]);

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
        <Metric label="Lighter Perp" value={countLiveOnchainRows(snapshot.rows).toString()} helper="mapped markets live" />
        <Metric label="Refresh" value="10s" helper={formatTime(snapshot.updatedAt)} />
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
              <h2>KRX Top Names</h2>
              <p>Rows stay visible even when an onchain market is not mapped.</p>
            </div>
            <Wifi size={18} />
          </div>

          <div className="market-table" role="table" aria-label="Korean stocks with Lighter perp prices">
            <div className="market-row market-head" role="row">
              <span>Asset</span>
              <span>Domestic</span>
              <span>Lighter USD</span>
              <span>USDT/KRW</span>
              <span>Gap</span>
              <span>24h</span>
            </div>
            {snapshot.rows.map((row) => (
              <button
                className={`market-row ${selectedRow?.stock.symbol === row.stock.symbol ? 'selected' : ''}`}
                key={row.stock.symbol}
                onClick={() => setSelectedSymbol(row.stock.symbol)}
                role="row"
                type="button"
              >
                <span className="asset-cell">
                  <strong>{row.stock.shortName}</strong>
                  <small>{row.stock.symbol}</small>
                </span>
                <span>{row.domestic ? formatKrw(row.domestic.priceKrw) : '-'}</span>
                <span>{row.lighter ? formatUsd(row.lighter.priceUsd) : row.onchainState.message ?? '-'}</span>
                <span>{row.convertedPriceKrw ? formatKrw(row.convertedPriceKrw) : '-'}</span>
                <ChangeCell value={row.gapPercent} />
                <ChangeCell value={row.lighter?.change24hPercent} />
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
