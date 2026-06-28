import {
  canRenderAuthenticatedChatShell,
  shouldAttemptChatReconnect,
  shouldShowChatConnectionFallback,
} from '@/lib/chat/chatShellState';

describe('chat shell state', () => {
  it('renders the authenticated shell even while the socket reconnects', () => {
    const input = {
      hasUser: true,
      hasAccessToken: true,
      isInitializationLoading: false,
      isSocketConnected: false,
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
      isSocketConnected: false,
      connectionTimeout: false,
    };

    expect(canRenderAuthenticatedChatShell(input)).toBe(false);
    expect(shouldShowChatConnectionFallback(input)).toBe(false);
  });

  it('retries chat when the socket instance exists but is still disconnected', () => {
    expect(
      shouldAttemptChatReconnect({
        hasUser: true,
        hasAccessToken: true,
        hasSocketInstance: true,
        isSocketConnected: false,
      }),
    ).toBe(true);
  });

  it('does not retry chat when auth is missing or the socket is already live', () => {
    expect(
      shouldAttemptChatReconnect({
        hasUser: false,
        hasAccessToken: true,
        hasSocketInstance: false,
        isSocketConnected: false,
      }),
    ).toBe(false);

    expect(
      shouldAttemptChatReconnect({
        hasUser: true,
        hasAccessToken: true,
        hasSocketInstance: true,
        isSocketConnected: true,
      }),
    ).toBe(false);
  });
});
