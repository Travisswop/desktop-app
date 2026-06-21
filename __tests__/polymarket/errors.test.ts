import { formatPolymarketError } from '@/lib/polymarket/errors';

describe('formatPolymarketError', () => {
  it('hides inactive Polygon RPC provider internals', () => {
    const raw =
      'missing revert data in call exception; Transaction reverted without a reason string ' +
      '{"code":"SERVER_ERROR","status":403,"body":"{\\"error\\":{\\"message\\":\\"App is inactive. Please create a new app\\"}}","url":"https://polygon-mainnet.g.alchemy.com/v2/redacted"}';

    expect(formatPolymarketError(new Error(raw))).toBe(
      'Trading payout service is temporarily unable to reach Polygon. Please try again shortly.',
    );
  });
});
