export type ChatShellStateInput = {
  hasUser: boolean;
  hasAccessToken: boolean;
  isInitializationLoading: boolean;
  hasSocket: boolean;
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
    (!input.hasSocket || input.connectionTimeout)
  );
}
