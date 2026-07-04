import {
  buildSwopAccessNotice,
  isSwopAccessError,
  swopAccessValue,
  type AgentGroupError,
} from '@/lib/chat/swopAccessNotice';

describe('swop access gate notice', () => {
  describe('isSwopAccessError', () => {
    it('matches the three gate codes', () => {
      expect(
        isSwopAccessError({ code: 'AGENT_SWOP_BALANCE_REQUIRED' })
      ).toBe(true);
      expect(
        isSwopAccessError({ code: 'AGENT_SWOP_BALANCE_CHECK_TIMEOUT' })
      ).toBe(true);
      expect(
        isSwopAccessError({ code: 'AGENT_SWOP_BALANCE_CHECK_FAILED' })
      ).toBe(true);
    });

    it('matches the legacy buyMoreSwop detail flag', () => {
      expect(
        isSwopAccessError({ code: 'SOMETHING_ELSE', details: { buyMoreSwop: true } })
      ).toBe(true);
    });

    it('ignores unrelated errors and nullish input', () => {
      expect(isSwopAccessError({ code: 'RATE_LIMITED' })).toBe(false);
      expect(isSwopAccessError(null)).toBe(false);
      expect(isSwopAccessError(undefined)).toBe(false);
    });
  });

  describe('swopAccessValue', () => {
    it('stringifies present values and falls back on empty/nullish', () => {
      expect(swopAccessValue(1000, 'x')).toBe('1000');
      expect(swopAccessValue('42', 'x')).toBe('42');
      expect(swopAccessValue('', 'fallback')).toBe('fallback');
      expect(swopAccessValue(null, 'fallback')).toBe('fallback');
      expect(swopAccessValue(undefined, 'fallback')).toBe('fallback');
    });
  });

  describe('buildSwopAccessNotice', () => {
    it('builds a locked notice from AGENT_SWOP_BALANCE_REQUIRED details', () => {
      const error: AgentGroupError = {
        code: 'AGENT_SWOP_BALANCE_REQUIRED',
        message: 'Agent requires SWOP',
        details: {
          agentId: 'goldman-sacks',
          agentName: 'Goldman',
          requiredSwop: 1000,
          currentSwop: 250,
          deficitSwop: 750,
          swopMint: 'SWoPmintXXXX',
        },
      };

      const notice = buildSwopAccessNotice(error);

      expect(notice.variant).toBe('locked');
      expect(notice.canBuySwop).toBe(true);
      expect(notice.agentName).toBe('Goldman');
      expect(notice.requiredSwop).toBe('1000');
      expect(notice.currentSwop).toBe('250');
      expect(notice.deficitSwop).toBe('750');
      expect(notice.swopMint).toBe('SWoPmintXXXX');
      // Uses structured details, not string-parsing the message.
      expect(notice.message).toContain('Goldman is locked');
      expect(notice.message).toContain('1000 SWOP');
      expect(notice.message).toContain('you have 250');
      expect(notice.message).toContain('Buy 750 more SWOP');
    });

    it('falls back to the provided agent name and default amounts', () => {
      const notice = buildSwopAccessNotice(
        { code: 'AGENT_SWOP_BALANCE_REQUIRED', details: {} },
        'Astro'
      );

      expect(notice.agentName).toBe('Astro');
      expect(notice.requiredSwop).toBe('1000');
      expect(notice.currentSwop).toBe('0');
      // deficit defaults to required when absent
      expect(notice.deficitSwop).toBe('1000');
      expect(notice.swopMint).toBeNull();
      expect(notice.canBuySwop).toBe(true);
    });

    it('builds a softer check-failed notice for timeout/failed codes', () => {
      const timeout = buildSwopAccessNotice({
        code: 'AGENT_SWOP_BALANCE_CHECK_TIMEOUT',
        message: 'Balance check timed out',
      });
      expect(timeout.variant).toBe('check_failed');
      expect(timeout.canBuySwop).toBe(false);
      expect(timeout.message).toBe('Balance check timed out');

      const failed = buildSwopAccessNotice({
        code: 'AGENT_SWOP_BALANCE_CHECK_FAILED',
      });
      expect(failed.variant).toBe('check_failed');
      expect(failed.canBuySwop).toBe(false);
      // Falls back to a friendly retry message when no message is supplied.
      expect(failed.message.toLowerCase()).toContain('try');
    });

    it('treats the legacy buyMoreSwop flag as locked', () => {
      const notice = buildSwopAccessNotice({
        code: 'AGENT_SWOP_BALANCE_CHECK_FAILED',
        details: { buyMoreSwop: true, requiredSwop: 500, currentSwop: 100 },
      });
      expect(notice.variant).toBe('locked');
      expect(notice.canBuySwop).toBe(true);
      expect(notice.deficitSwop).toBe('500');
    });
  });
});
