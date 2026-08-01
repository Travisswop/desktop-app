/**
 * @jest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import Header from '@/components/Header';

const mockRouter = {
  prefetch: jest.fn(),
  push: jest.fn(),
};

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => mockRouter,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt = '', ...props }: { alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: React.ComponentProps<'a'>) => (
    <a {...props}>{children}</a>
  ),
}));

jest.mock('@/components/notifications', () => ({
  NotificationBell: () => <span>Notifications</span>,
}));

jest.mock('@/lib/UserContext', () => ({
  useUser: () => ({
    user: { name: 'Test User', followers: 0, following: 0 },
    loading: false,
    logout: jest.fn(),
    primaryMicrositeProfilePic: null,
  }),
}));

jest.mock('@/components/wallet/AddCashModal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog">Add cash keypad</div> : null,
}));

describe('Header Add Cash action', () => {
  let nextAnimationFrame: FrameRequestCallback | null;

  beforeEach(() => {
    jest.useFakeTimers();
    nextAnimationFrame = null;
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        nextAnimationFrame = callback;
        return 1;
      });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('closes the account menu before opening the Add Cash modal', () => {
    render(<Header />);

    fireEvent.keyDown(
      screen.getByRole('button', {
        name: 'Open account menu for Test User',
      }),
      { key: 'Enter' },
    );

    const addCash = screen.getByRole('menuitem', { name: /Add Cash/ });
    fireEvent.click(addCash);

    expect(screen.queryByRole('menuitem', { name: /Add Cash/ })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(nextAnimationFrame).not.toBeNull();

    act(() => nextAnimationFrame?.(0));

    expect(screen.getByRole('dialog')).toHaveTextContent('Add cash keypad');
  });
});
