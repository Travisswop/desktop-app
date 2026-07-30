/**
 * @jest-environment jsdom
 */

// AuthGuard's effect and its render used to disagree about what counts as a
// session: the effect accepted the Swop backend cookies (which never expire on
// their own) and skipped the redirect, while the render demanded Privy's
// `authenticated` and returned null. A user coming back after their Privy
// session lapsed landed between the two and saw a permanently blank page.
import { render, screen, waitFor } from '@testing-library/react';
import Cookies from 'js-cookie';
import AuthGuard from '@/components/AuthGuard';

const replace = jest.fn();
let privyState = { ready: true, authenticated: false };

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: () => privyState,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

describe('AuthGuard with a lapsed Privy session', () => {
  beforeEach(() => {
    replace.mockClear();
    privyState = { ready: true, authenticated: false };
    // The state a long-dormant user returns in: backend cookies still set.
    Cookies.set('user-id', '6854cee7fc9ec119e1cfc892');
    Cookies.set('access-token', 'stale-dormant-session-token');
  });

  afterEach(() => {
    Cookies.remove('user-id');
    Cookies.remove('access-token');
  });

  it('redirects to /login instead of stranding the user on a blank page', async () => {
    render(
      <AuthGuard>
        <div>wallet</div>
      </AuthGuard>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('wallet')).not.toBeInTheDocument();
  });

  it('clears the stale backend cookies so the next load is clean', async () => {
    render(
      <AuthGuard>
        <div>wallet</div>
      </AuthGuard>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(Cookies.get('access-token')).toBeUndefined();
    expect(Cookies.get('user-id')).toBeUndefined();
  });

  it('still renders children for a genuinely authenticated user', async () => {
    privyState = { ready: true, authenticated: true };

    render(
      <AuthGuard>
        <div>wallet</div>
      </AuthGuard>,
    );

    expect(screen.getByText('wallet')).toBeInTheDocument();
    await waitFor(() => expect(replace).not.toHaveBeenCalled());
    // A real session must never have its cookies cleared.
    expect(Cookies.get('access-token')).toBe('stale-dormant-session-token');
  });
});
