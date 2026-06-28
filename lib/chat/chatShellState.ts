export type ChatShellStateInput = {
  hasUser: boolean;
  hasAccessToken: boolean;
  isInitializationLoading: boolean;
  isSocketConnected: boolean;
  connectionTimeout: boolean;
};

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
