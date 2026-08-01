/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddCashModal from '@/components/wallet/AddCashModal';

const mockCreateSession = jest.fn();
const mockCreateOrder = jest.fn();
const mockGetPhoneStatus = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock('@privy-io/react-auth', () => ({
  useWallets: () => ({
    wallets: [{ address: '0x1234567890abcdef1234567890abcdef12345678' }],
  }),
}));

jest.mock('@privy-io/react-auth/solana', () => ({
  useWallets: () => ({ wallets: [] }),
}));

jest.mock('@/lib/UserContext', () => ({
  useUser: () => ({
    accessToken: 'access-token',
    user: {
      ethAddress: '0x1234567890abcdef1234567890abcdef12345678',
    },
  }),
}));

jest.mock('@/services/wallet-service', () => ({
  __esModule: true,
  default: {
    createCoinbaseOnrampSession: (...args: unknown[]) =>
      mockCreateSession(...args),
    createCoinbaseOnrampOrder: (...args: unknown[]) => mockCreateOrder(...args),
    getOnrampPhoneStatus: (...args: unknown[]) =>
      mockGetPhoneStatus(...args),
  },
}));

jest.mock('@/components/modal/CustomModal', () => ({
  __esModule: true,
  default: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div role="dialog">{children}</div> : null),
}));

jest.mock('@/components/celebrations/TradeCelebration', () => ({
  TradeCelebrationOverlay: () => null,
}));

describe('Add Cash debit-card checkout', () => {
  beforeEach(() => {
    delete (window as Window & { ApplePaySession?: unknown }).ApplePaySession;
    mockCreateSession.mockReset();
    mockCreateOrder.mockReset();
    mockGetPhoneStatus.mockReset();
    mockRouterPush.mockReset();
    mockGetPhoneStatus.mockResolvedValue({
      otpRequired: true,
      verified: false,
      phoneNumberMasked: null,
      verifiedAt: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens Coinbase Hosted Onramp with the selected amount and network', async () => {
    const replace = jest.fn();
    const close = jest.fn();
    const checkoutWindow = {
      close,
      location: { replace },
      opener: window,
    } as unknown as Window;
    jest.spyOn(window, 'open').mockReturnValue(checkoutWindow);
    mockCreateSession.mockResolvedValue({
      onrampUrl: 'https://pay.coinbase.com/buy/select-asset?sessionToken=test',
      destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
      destinationNetwork: 'base',
      purchaseCurrency: 'USDC',
      paymentCurrency: 'USD',
      paymentAmount: '25',
      quote: null,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AddCashModal isOpen onClose={jest.fn()} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '$25' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Buy with Debit card' }),
    );

    await waitFor(() => expect(mockCreateSession).toHaveBeenCalledTimes(1));
    expect(window.open).toHaveBeenCalledWith(
      'about:blank',
      'swop-coinbase-onramp',
      expect.stringContaining('popup=yes'),
    );
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        network: 'base',
        paymentAmount: '25',
        paymentCurrency: 'USD',
        purchaseCurrency: 'USDC',
      }),
      'access-token',
    );
    expect(replace).toHaveBeenCalledWith(
      'https://pay.coinbase.com/buy/select-asset?sessionToken=test',
    );
    expect(close).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Coinbase checkout opened'),
    ).toBeInTheDocument();
  });

  it('shows a useful message when Chrome blocks the checkout popup', async () => {
    jest.spyOn(window, 'open').mockReturnValue(null);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AddCashModal isOpen onClose={jest.fn()} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '$25' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Buy with Debit card' }),
    );

    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Allow pop-ups for Swop/),
    ).toBeInTheDocument();
  });

  it('opens Coinbase Apple Pay scan-to-pay directly in Chrome', async () => {
    const replace = jest.fn();
    const close = jest.fn();
    const checkoutWindow = {
      close,
      location: { replace },
      opener: window,
    } as unknown as Window;
    jest.spyOn(window, 'open').mockReturnValue(checkoutWindow);
    mockGetPhoneStatus.mockResolvedValue({
      otpRequired: true,
      verified: true,
      phoneNumberMasked: '(***) ***-1234',
      verifiedAt: new Date().toISOString(),
    });
    mockCreateOrder.mockResolvedValue({
      paymentLink: {
        url: 'https://pay.coinbase.com/v2/api-onramp/apple-pay?sessionToken=test',
        paymentLinkType: 'PAYMENT_LINK_TYPE_APPLE_PAY_BUTTON',
      },
      order: {},
      destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
      destinationNetwork: 'base',
      purchaseCurrency: 'USDC',
      paymentCurrency: 'USD',
      paymentAmount: '25',
      paymentMethod: 'GUEST_CHECKOUT_APPLE_PAY',
      sandbox: false,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AddCashModal isOpen onClose={jest.fn()} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '$25' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Debit card' }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Apple Pay Scan with your iPhone to confirm with Apple Pay/,
      }),
    );
    await waitFor(() =>
      expect(mockGetPhoneStatus).toHaveBeenCalledWith('access-token'),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Buy with Apple Pay' }),
    );

    await waitFor(() => expect(mockCreateOrder).toHaveBeenCalledTimes(1));
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.not.objectContaining({ domain: expect.anything() }),
      'access-token',
    );
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        network: 'base',
        paymentAmount: '25',
        paymentMethod: 'GUEST_CHECKOUT_APPLE_PAY',
      }),
      'access-token',
    );
    expect(window.open).toHaveBeenCalledWith(
      'about:blank',
      'swop-apple-pay',
      expect.stringContaining('popup=yes'),
    );
    expect(replace).toHaveBeenCalledWith(
      'https://pay.coinbase.com/v2/api-onramp/apple-pay?sessionToken=test',
    );
    expect(close).not.toHaveBeenCalled();
    expect(await screen.findByText('Apple Pay is ready')).toBeInTheDocument();
    expect(screen.getByText(/Swop app is not required/)).toBeInTheDocument();
  });

  it('keeps Safari Apple Pay embedded with the required iframe policy', async () => {
    Object.defineProperty(window, 'ApplePaySession', {
      configurable: true,
      value: { canMakePayments: () => true },
    });
    mockGetPhoneStatus.mockResolvedValue({
      otpRequired: true,
      verified: true,
      phoneNumberMasked: '(***) ***-1234',
      verifiedAt: new Date().toISOString(),
    });
    mockCreateOrder.mockResolvedValue({
      paymentLink: {
        url: 'https://pay.coinbase.com/v2/api-onramp/apple-pay?sessionToken=test',
        paymentLinkType: 'PAYMENT_LINK_TYPE_APPLE_PAY_BUTTON',
      },
      order: {},
      destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
      destinationNetwork: 'base',
      purchaseCurrency: 'USDC',
      paymentCurrency: 'USD',
      paymentAmount: '25',
      paymentMethod: 'GUEST_CHECKOUT_APPLE_PAY',
      sandbox: false,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AddCashModal isOpen onClose={jest.fn()} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '$25' }));
    await waitFor(() =>
      expect(mockGetPhoneStatus).toHaveBeenCalledWith('access-token'),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Buy with Apple Pay' }),
    );

    await waitFor(() => expect(mockCreateOrder).toHaveBeenCalledTimes(1));
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: 'GUEST_CHECKOUT_APPLE_PAY',
        domain: 'localhost',
      }),
      'access-token',
    );

    const paymentFrame = await screen.findByTitle('Coinbase payment');
    expect(paymentFrame).toHaveAttribute('allow', 'payment');
    expect(paymentFrame).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin',
    );
    expect(paymentFrame).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(paymentFrame).toHaveStyle({ height: '220px' });
  });
});
