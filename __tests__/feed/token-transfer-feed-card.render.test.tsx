/**
 * Render-level (React Testing Library) coverage for TokenTransferFeedCard.
 *
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import TokenTransferFeedCard from '@/components/feed/TokenTransferFeedCard';

describe('TokenTransferFeedCard rendering', () => {
  it('renders a sent stablecoin transfer with names, amounts, and explorer link', () => {
    render(
      <TokenTransferFeedCard
        feed={{
          smartsiteDetails: { name: 'Alice', ens: 'alice' },
          content: {
            direction: 'sent',
            sender_ens: 'alice',
            receiver_ens: 'bob',
            sender_wallet_address: '7f9pXhBBpDx8ZLnhFwJDVYyEfSpBkTLZYQZQxAAAA111',
            receiver_wallet_address: '9k2mYhCCqEy9AMoiGxKEWZzFgTqClUMaZRaRyBBBB222',
            token: 'USDC',
            amount: 25,
            tokenPrice: 25,
            chain: 'solana',
            transaction_hash: 'txhash123',
          },
        }}
      />,
    );

    expect(screen.getByText('SENT')).toBeInTheDocument();
    // Stablecoins render with two decimals and no "+" prefix when sent.
    expect(screen.getByText('25.00')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('Solana')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    // Bare swop handles render as <Name>.Swop.Id.
    expect(screen.getByText('Bob.Swop.Id')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();

    const explorer = screen.getByRole('link', { name: /Solscan/ });
    expect(explorer).toHaveAttribute(
      'href',
      'https://solscan.io/tx/txhash123',
    );
  });

  it('renders a received transfer with a + amount and the receiving identity', () => {
    render(
      <TokenTransferFeedCard
        feed={{
          smartsiteDetails: { name: 'Bob', ens: 'bob' },
          content: {
            direction: 'received',
            sender_ens: 'alice',
            receiver_ens: 'bob',
            token: 'SOL',
            amount: 1.5,
            usdValue: 210.4,
            chain: 'solana',
          },
        }}
      />,
    );

    expect(screen.getByText('RECEIVED')).toBeInTheDocument();
    expect(screen.getByText('+1.5')).toBeInTheDocument();
    expect(screen.getByText('SOL')).toBeInTheDocument();
    expect(screen.getByText('$210.40')).toBeInTheDocument();
    // The feed owner's display name is applied to the receiving side.
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // No transaction hash → no explorer link.
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('falls back to truncated wallet addresses when no names or ENS exist', () => {
    render(
      <TokenTransferFeedCard
        feed={{
          content: {
            direction: 'sent',
            sender_wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
            receiver_wallet_address: '0xabcdef1234567890abcdef1234567890abcdef12',
            token: 'ETH',
            amount: 0.25,
            chain: 'ethereum',
          },
        }}
      />,
    );

    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getAllByText('0x1234...5678').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0xabcd...ef12').length).toBeGreaterThan(0);
  });
});
