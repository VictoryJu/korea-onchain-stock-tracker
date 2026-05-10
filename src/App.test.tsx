import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the live market board shell', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /korea onchain stock tracker/i })).toBeInTheDocument();
    expect(screen.getAllByText(/USDT\/KRW/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lighter Perp/i).length).toBeGreaterThan(0);
    expect(screen.getByText('SAMSUNG')).toBeInTheDocument();
  });
});
