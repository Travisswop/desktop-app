export type AgentThreadSearchRecovery = {
  agentId: 'astro' | 'goldman-sacks';
  title: string;
  detail: string;
  actionLabel: string;
};

const RECOVERY_PATTERNS: Array<{
  match: RegExp;
  recovery: AgentThreadSearchRecovery;
}> = [
  {
    match: /\b(@?astro|astro trading desk)\b/i,
    recovery: {
      agentId: 'astro',
      title: 'Astro opens from the desk button',
      detail:
        'Astro is a built-in agent, so it will not appear in direct contact search. Open Astro Trading Desk to start the supported chat thread.',
      actionLabel: 'Open Astro Trading Desk',
    },
  },
  {
    match: /\b(@?goldman|@?sacks|goldman sacks)\b/i,
    recovery: {
      agentId: 'goldman-sacks',
      title: 'Goldman opens from the desk button',
      detail:
        'Goldman Sacks is a built-in strategy desk, not a direct contact. Open the Goldman desk from the agent shortcuts instead of searching direct recipients.',
      actionLabel: 'Open Goldman Sacks',
    },
  },
];

export function getAgentThreadSearchRecovery(
  mode: 'direct' | 'group',
  query: string
): AgentThreadSearchRecovery | null {
  if (mode !== 'direct') return null;

  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return null;

  return (
    RECOVERY_PATTERNS.find(({ match }) => match.test(normalizedQuery))
      ?.recovery || null
  );
}
