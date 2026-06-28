import {
  canRenderAuthenticatedChatShell,
  shouldShowChatConnectionFallback,
} from '@/lib/chat/chatShellState';

describe('chat shell state', () => {
  it('renders the authenticated shell even while the socket reconnects', () => {
    const input = {
      hasUser: true,
      hasAccessToken: true,
      isInitializationLoading: false,
      hasSocket: false,
      connectionTimeout: true,
    };

    expect(canRenderAuthenticatedChatShell(input)).toBe(true);
    expect(shouldShowChatConnectionFallback(input)).toBe(true);
  });

  it('keeps the boot shell hidden until auth initialization finishes', () => {
    const input = {
      hasUser: true,
      hasAccessToken: true,
      isInitializationLoading: true,
      hasSocket: false,
      connectionTimeout: false,
    };

    expect(canRenderAuthenticatedChatShell(input)).toBe(false);
    expect(shouldShowChatConnectionFallback(input)).toBe(false);
  });
});
