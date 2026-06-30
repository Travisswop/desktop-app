export type GroupModalEmptyStateMode = 'direct' | 'group';

type GroupModalEmptyStateConfig = {
  title: string;
  detail: string;
  actionLabel?: string;
};

function normalizeSearchQuery(query: string) {
  return query.trim().toLowerCase().replace(/^@+/, '');
}

export function isAstroDirectSearchQuery(query: string) {
  return normalizeSearchQuery(query).includes('astro');
}

export function getGroupModalNoResultsState(
  mode: GroupModalEmptyStateMode,
  query: string
): GroupModalEmptyStateConfig {
  if (mode === 'direct' && isAstroDirectSearchQuery(query)) {
    return {
      title: "Astro isn't a direct contact",
      detail:
        'Use Astro Trading Desk to start an Astro conversation. Direct recipient search only lists people.',
      actionLabel: 'Open Astro Trading Desk',
    };
  }

  return {
    title: 'No matches',
    detail: 'Try another name or handle.',
  };
}
