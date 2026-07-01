import { getProtectedAgentSearchHint } from '@/components/chat/protectedAgentThreads';

describe('getProtectedAgentSearchHint', () => {
  it('recognizes Astro desk searches from direct-chat queries', () => {
    expect(getProtectedAgentSearchHint('astro')).toMatchObject({
      agentId: 'astro',
      label: 'Astro',
      groupName: 'Astro Trading Desk',
    });
  });

  it('recognizes Goldman desk searches from handle variants', () => {
    expect(getProtectedAgentSearchHint('goldmansacks.swop.id')).toMatchObject({
      agentId: 'goldman-sacks',
      label: 'Goldman Sacks',
      groupName: 'Goldman Sacks',
    });
  });

  it('returns null for ordinary contact searches', () => {
    expect(getProtectedAgentSearchHint('alice')).toBeNull();
  });
});
