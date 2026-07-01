export type ChatShellStateInput = {
  hasUser: boolean;
  hasAccessToken: boolean;
  isInitializationLoading: boolean;
  isSocketConnected: boolean;
  connectionTimeout: boolean;
};

export type ChatConnectionFallbackCause =
  | 'connection_timeout'
  | 'socket_disconnected';

export type ChatRetryAction =
  | 'refresh_auth'
  | 'connect_socket'
  | 'reconnect_socket';

export function canRenderAuthenticatedChatShell({
  hasUser,
  hasAccessToken,
  isInitializationLoading,
}: ChatShellStateInput): boolean {
  return hasUser && hasAccessToken && !isInitializationLoading;
}

export function shouldShowChatConnectionFallback(
  input: ChatShellStateInput,
): boolean {
  return (
    canRenderAuthenticatedChatShell(input) &&
    (!input.isSocketConnected || input.connectionTimeout)
  );
}

export function shouldAttemptChatReconnect({
  hasUser,
  hasAccessToken,
  hasSocketInstance,
  isSocketConnected,
}: {
  hasUser: boolean;
  hasAccessToken: boolean;
  hasSocketInstance: boolean;
  isSocketConnected: boolean;
}): boolean {
  return hasUser && hasAccessToken && (!hasSocketInstance || !isSocketConnected);
}

export function getChatConnectionFallbackCause(
  input: ChatShellStateInput,
): ChatConnectionFallbackCause | null {
  if (!shouldShowChatConnectionFallback(input)) {
    return null;
  }

  if (input.connectionTimeout) {
    return 'connection_timeout';
  }

  return 'socket_disconnected';
}

export function getChatRetryAction({
  hasUserId,
  hasAccessToken,
  hasSocket,
}: {
  hasUserId: boolean;
  hasAccessToken: boolean;
  hasSocket: boolean;
}): ChatRetryAction {
  if (!hasUserId || !hasAccessToken) {
    return 'refresh_auth';
  }

  return hasSocket ? 'reconnect_socket' : 'connect_socket';
}
