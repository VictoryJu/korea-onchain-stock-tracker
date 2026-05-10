# Korea Onchain Stock Tracker Design

Date: 2026-05-10

## Goal

Build a real-time market board that keeps showing price discovery for major Korean stocks after the domestic stock market and after-hours sessions stop trading. The first version prioritizes seeing live data, not generating complex trading signals.

The main product question is:

> After the Korean cash market closes, how are Samsung Electronics and SK Hynix moving in 24-hour onchain markets, and what does that imply in KRW terms?

## Primary User Experience

The app opens directly into a Coinbase-style market dashboard. It should feel like a clean trading terminal: white background, restrained borders, blue accent color, dense numeric tables, and fast live updates.

The main table shows Korean market leaders and their onchain equivalent when available:

```text
Stock | Domestic price | Lighter USD | Upbit USDT/KRW converted price | Domestic close gap | 24h onchain change | Updated
```

During Korean market hours, domestic and onchain values can move together. After the Korean market closes, the domestic price remains anchored to the last available close or after-hours value, while the Lighter price keeps updating.

## Data Sources

### Lighter

Use Lighter as the primary 24-hour onchain source for Korean stock-linked perpetual futures.

Initial mappings:

```text
005930.KS Samsung Electronics -> SAMSUNG perp
000660.KS SK Hynix -> SKHYNIX perp
005380.KS Hyundai Motor -> HYUNDAI perp, if available
Korean index proxy -> KRCOMP perp, if available
```

Lighter values must be labeled as perpetual futures, not spot equities.

### Upbit

Use Upbit `KRW-USDT` as the KRW conversion reference for USD or USDT-denominated onchain prices.

The app should label converted values as `USDT/KRW converted`, because this is not the official USD/KRW fixing and can include local stablecoin premium or discount.

### Korean Equities

Use a Korean market data source for domestic stock price, close, volume, and turnover. The initial ranking should prefer turnover top 5 rather than raw volume top 5, because raw volume can over-rank low-price stocks.

If a top 5 stock has no onchain mapping, the row should still appear with an explicit no-onchain-market state.

## Core Metrics

- Lighter price in USD/USDT terms
- Upbit KRW-USDT conversion rate
- Lighter converted KRW price
- Domestic last price or close
- Gap percentage: `(converted_onchain_price - domestic_reference_price) / domestic_reference_price`
- 24-hour onchain change
- Last update time and data freshness state

## Signal Layer

Signals are secondary. The first version should not hide raw prices behind predictions.

Later signal additions:

- Post-close accumulated onchain move
- Estimated next-session gap
- Alert when the onchain gap crosses a configured threshold
- Separate market state labels for pre-open, regular session, after-hours, closed, and weekend

## UI Direction

Use a Coinbase-like market interface:

- Numeric table as the primary surface
- Selected-stock detail panel with price chart
- Clear market-status strip
- Blue accent for selected rows and primary actions
- Green/red only for price movement
- No decorative hero page
- No marketing layout

Implementation can inspect Coinbase-style assets/components with:

```bash
npx getdesign@latest add coinbase
```

## Error Handling

Each data source should have its own freshness and failure state.

- If Lighter fails, domestic prices remain visible and onchain columns show stale or unavailable state.
- If Upbit fails, USD prices remain visible and KRW conversion shows unavailable state.
- If Korean market data fails, Lighter data still updates and domestic reference shows stale or unavailable state.

The dashboard should never silently mix stale and fresh values.

## Non-Goals For The First Version

- Automated trading
- Investment recommendations
- Portfolio management
- Backtesting engine
- Full multi-chain tokenized stock scanner
- Complex predictive model

## Open Implementation Decisions

- Exact Korean equity data provider
- Exact Lighter public API endpoint or SDK path for market data
- Whether the first build stores historical ticks locally or only renders live snapshots
- Whether deployment is local-only first or hosted immediately
