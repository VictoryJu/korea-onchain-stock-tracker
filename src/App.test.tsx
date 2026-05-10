import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the live market board shell', () => {
    const { container } = render(<App />);

    expect(screen.getByRole('heading', { name: /korea onchain stock tracker/i })).toBeInTheDocument();
    expect(screen.getAllByText(/USDT\/KRW/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lighter Perp/i).length).toBeGreaterThan(0);
    expect(screen.getByText('SAMSUNGUSD')).toBeInTheDocument();
    expect(screen.getByLabelText(/lighter mapped stock cards/i)).toBeInTheDocument();
    expect(screen.queryByText('NAVER')).not.toBeInTheDocument();
    expect(screen.queryByText('Kakao')).not.toBeInTheDocument();
    expect(container.querySelectorAll('number-flow-react').length).toBeGreaterThan(0);
  });

  it('emphasizes gap and 24h change metrics in the card grid', () => {
    render(<App />);

    expect(screen.getAllByText('Gap')[0].closest('.card-change-metric')).not.toBeNull();
    expect(screen.getAllByText('24h')[0].closest('.card-change-metric')).not.toBeNull();
  });
});
