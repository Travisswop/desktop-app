/**
 * @jest-environment jsdom
 */

// The Subscribe button used to strand users on a permanent spinner: it had no
// try/catch, so any throw between the click and the redirect skipped
// `setLoading(false)` and the button span forever with no error shown. Three
// live paths threw — a blocked js.stripe.com (it awaited Stripe.js it never
// used), a non-JSON upstream reply, and a network failure. It also let a
// signed-out user open a checkout session with no `userId`, which Stripe's
// webhook needs to grant Premium.
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import SubscribeButton from '@/components/StripeSubscriptionBtn';

const toastError = jest.fn();
const toastSuccess = jest.fn();
let currentUser: { _id?: string; email?: string } | null = {
  _id: '6854cee7fc9ec119e1cfc892',
  email: 'buyer@example.com',
};

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

jest.mock('@/lib/UserContext', () => ({
  useUser: () => ({ user: currentUser }),
}));

const originalLocation = window.location;

function clickSubscribe() {
  return act(async () => {
    screen.getByRole('button').click();
  });
}

describe('SubscribeButton', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    toastError.mockClear();
    toastSuccess.mockClear();
    currentUser = {
      _id: '6854cee7fc9ec119e1cfc892',
      email: 'buyer@example.com',
    };
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  const spinner = () =>
    document.querySelector('.animate-spin') as HTMLElement | null;

  it('redirects to the Stripe checkout URL on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/cs_live_x' }),
    }) as unknown as typeof fetch;

    render(<SubscribeButton plan="Premium" label="Upgrade Premium" />);
    await clickSubscribe();

    await waitFor(() =>
      expect(window.location.href).toBe(
        'https://checkout.stripe.com/c/pay/cs_live_x'
      )
    );
    expect(toastError).not.toHaveBeenCalled();
  });

  it('sends the plan and userId the Stripe webhook needs', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ url: 'https://checkout.stripe.com/x' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SubscribeButton plan="PremiumYearly" label="Upgrade" />);
    await clickSubscribe();

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.plan).toBe('PremiumYearly');
    expect(body.userId).toBe('6854cee7fc9ec119e1cfc892');
  });

  it('stops the spinner and surfaces the error when the request fails', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('Failed to fetch')) as unknown as typeof fetch;

    render(<SubscribeButton plan="Premium" label="Upgrade Premium" />);
    await clickSubscribe();

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(spinner()).toBeNull();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('stops the spinner when the upstream returns HTML instead of JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 504,
      text: async () => '<html><body>Gateway Timeout</body></html>',
    }) as unknown as typeof fetch;

    render(<SubscribeButton plan="Premium" label="Upgrade Premium" />);
    await clickSubscribe();

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toMatch(/unavailable/i);
    expect(spinner()).toBeNull();
  });

  it('shows the backend error for an existing subscription (409)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () =>
        JSON.stringify({
          error:
            'Your Premium is billed through the App Store. Manage it in your Apple subscription settings.',
        }),
    }) as unknown as typeof fetch;

    render(<SubscribeButton plan="Premium" label="Upgrade Premium" />);
    await clickSubscribe();

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toMatch(/App Store/);
    expect(spinner()).toBeNull();
  });

  it('refuses to open checkout with no userId, so no orphan session is paid for', async () => {
    currentUser = { email: 'buyer@example.com' };
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SubscribeButton plan="Premium" label="Upgrade Premium" />);
    await clickSubscribe();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(
      'Please sign in again before subscribing.'
    );
    expect(spinner()).toBeNull();
  });
});
