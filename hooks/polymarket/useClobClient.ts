// All CLOB operations are now handled server-side by polymarket-backend.
// This stub keeps existing call sites compiling without any runtime changes.

export function useClobClient(
  _tradingSession: unknown,
  _isTradingSessionComplete: unknown,
) {
  return { clobClient: null };
}
