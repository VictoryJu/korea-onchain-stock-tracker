import { describe, expect, it } from 'vitest';
import {
  calculateGapPercent,
  convertUsdToKrw,
  trackedStocks,
} from './markets';

describe('market domain helpers', () => {
  it('converts USD-denominated onchain prices with the Upbit USDT/KRW rate', () => {
    expect(convertUsdToKrw(100, 1400)).toBe(140000);
  });

  it('calculates the converted onchain gap from the domestic reference price', () => {
    expect(calculateGapPercent(112000, 100000)).toBe(12);
  });

  it('contains initial Lighter mappings for Samsung and SK Hynix', () => {
    expect(trackedStocks.find((stock) => stock.symbol === '005930.KS')?.lighterSymbol).toBe('SAMSUNG');
    expect(trackedStocks.find((stock) => stock.symbol === '000660.KS')?.lighterSymbol).toBe('SKHYNIX');
  });
});
