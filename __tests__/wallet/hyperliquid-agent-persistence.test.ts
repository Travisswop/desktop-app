import {
  agentMasterStorageKey,
  isAgentApprovalActive,
  legacyAgentMasterStorageKey,
  normalizeAgentValidUntilMs,
} from '@/components/wallet/perps/hyperliquidAgentPersistence';

describe('Hyperliquid agent persistence', () => {
  it('uses a storage-safe master key that is not removed by Privy cleanup', () => {
    const privyUserId = 'did:privy:abc123';

    expect(agentMasterStorageKey(privyUserId)).not.toContain('privy');
    expect(legacyAgentMasterStorageKey(privyUserId)).toContain('privy');
  });

  it('treats second-based validUntil values as future approvals', () => {
    const nowMs = 1_700_000_000_000;
    const validUntilSeconds = 1_700_000_060;

    expect(normalizeAgentValidUntilMs(validUntilSeconds)).toBe(
      validUntilSeconds * 1000,
    );
    expect(
      isAgentApprovalActive(
        {
          address: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          validUntil: validUntilSeconds,
        },
        '0xa0B86991c6218B36C1d19D4a2E9Eb0cE3606eB48',
        nowMs,
      ),
    ).toBe(true);
  });

  it('keeps millisecond-based validUntil values unchanged', () => {
    const validUntilMs = 1_700_000_060_000;

    expect(normalizeAgentValidUntilMs(validUntilMs)).toBe(validUntilMs);
  });

  it('rejects expired approvals and mismatched agent addresses', () => {
    expect(
      isAgentApprovalActive(
        { address: '0x1111111111111111111111111111111111111111', validUntil: 1 },
        '0x1111111111111111111111111111111111111111',
        2_000,
      ),
    ).toBe(false);

    expect(
      isAgentApprovalActive(
        { address: '0x2222222222222222222222222222222222222222' },
        '0x1111111111111111111111111111111111111111',
      ),
    ).toBe(false);
  });
});
