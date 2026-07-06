import {
  getAgentThreadSearchRecovery,
} from '@/lib/chat/agentThreadSearchRecovery';

describe('getAgentThreadSearchRecovery', () => {
  it('returns an Astro recovery path for direct searches that target Astro', () => {
    expect(getAgentThreadSearchRecovery('direct', 'Astro')).toEqual({
      agentId: 'astro',
      title: 'Astro opens from the desk button',
      detail:
        'Astro is a built-in agent, so it will not appear in direct contact search. Open Astro Trading Desk to start the supported chat thread.',
      actionLabel: 'Open Astro Trading Desk',
    });
  });

  it('returns a Goldman recovery path for direct searches that target Goldman', () => {
    expect(getAgentThreadSearchRecovery('direct', '@goldman')).toEqual({
      agentId: 'goldman-sacks',
      title: 'Goldman opens from the desk button',
      detail:
        'Goldman Sacks is a built-in strategy desk, not a direct contact. Open the Goldman desk from the agent shortcuts instead of searching direct recipients.',
      actionLabel: 'Open Goldman Sacks',
    });
  });

  it('does not override normal no-match states for ordinary searches or group mode', () => {
    expect(getAgentThreadSearchRecovery('direct', 'alice')).toBeNull();
    expect(getAgentThreadSearchRecovery('group', 'astro')).toBeNull();
  });
});
