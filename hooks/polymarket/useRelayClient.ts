// All relay operations are now handled server-side by polymarket-backend.
// This stub keeps existing call sites compiling without any runtime changes.

export function useRelayClient() {
  return {
    relayClient: null,
    initializeRelayClient: async () => null,
    clearRelayClient: () => {},
  };
}
