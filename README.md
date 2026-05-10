# Korea Onchain Stock Tracker

Real-time dashboard for Korean equity names that continue trading through onchain perpetual markets after the Korea market closes.

Initial focus:

- Samsung Electronics (`005930.KS`) mapped to Lighter `SAMSUNG` perp
- SK Hynix (`000660.KS`) mapped to Lighter `SKHYNIX` perp
- KRW conversion via Upbit `KRW-USDT`
- Coinbase-like market dashboard UI

This is not an investment advisory tool. Lighter prices are perpetual futures prices, not Korean cash equity prices.

## Run Locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm test -- --run
npm run build
```

## Data Notes

- Lighter values are labeled as perpetual futures, not tokenized spot equities.
- KRW conversion uses Upbit `KRW-USDT`, so converted prices reflect the local USDT/KRW market rather than an official USD/KRW fixing.
- Domestic Korean equity rows are fetched through the local Vite API route `/api/domestic/top-turnover`, which calls Naver's mobile stock endpoints server-side to avoid browser CORS failures.
- The domestic board shows the top Korean stocks by accumulated trading value from Naver market lists, excluding ETF rows, then pins Samsung Electronics, SK Hynix, and Hyundai Motor when they are not already in the top set.
- Each feed has its own freshness state so Lighter, Upbit, and domestic data failures can be shown independently.
