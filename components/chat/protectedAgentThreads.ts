type ThreadKind = 'private' | 'direct' | 'group' | null | undefined;

type ProtectedAgentIdentity = {
  agentId: string;
  label: string;
  groupName: string;
  agentIds: string[];
  directNames: string[];
  directHandles: string[];
};

const PROTECTED_AGENT_IDENTITIES: ProtectedAgentIdentity[] = [
  {
    agentId: 'astro',
    label: 'Astro',
    groupName: 'Astro Trading Desk',
    agentIds: ['astro'],
    directNames: ['astro', 'astro swop', 'swop agent'],
    directHandles: ['astro', 'astro.swop.id', 'astroswop', 'astroswop.swop.id'],
  },
  {
    agentId: 'goldman-sacks',
    label: 'Goldman Sacks',
    groupName: 'Goldman Sacks',
    agentIds: ['goldman', 'goldman-sacks'],
    directNames: ['goldman', 'goldman sacks'],
    directHandles: [
      'goldman',
      'goldman.swop.id',
      'goldmansacks',
      'goldmansacks.swop.id',
      'goldman-sacks',
      'goldman-sacks.swop.id',
      'goldman.sacks',
      'goldman.sacks.swop.id',
    ],
  },
];

function normalizeIdentity(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function compactIdentity(value: unknown) {
  return normalizeIdentity(value).replace(/[^a-z0-9]/g, '');
}

function resolveThreadKind(thread: any, type?: ThreadKind) {
  if (type === 'private' || type === 'direct') return 'private';
  if (type === 'group') return 'group';
  if (thread?.type === 'direct' || thread?.type === 'private') return 'private';
  if (thread?.type === 'group') return 'group';
  return null;
}

function compactSet(values: string[]) {
  return new Set(values.map(compactIdentity));
}

function normalizedSet(values: string[]) {
  return new Set(values.map(normalizeIdentity));
}

function getDirectAgentIdCandidates(thread: any) {
  return [
    thread?.agentId,
    thread?.participant?.agentId,
    thread?.participant?.userId?.agentId,
    thread?.userId?.agentId,
    thread?.microsite?.agentId,
    thread?.microsite?.metadata?.agentId,
  ];
}

function getDirectNameCandidates(thread: any) {
  return [
    thread?.name,
    thread?.displayName,
    thread?.participant?.name,
    thread?.participant?.displayName,
    thread?.participant?.userId?.name,
    thread?.participant?.userId?.displayName,
    thread?.microsite?.name,
    thread?.microsite?.displayName,
  ];
}

function getDirectHandleCandidates(thread: any) {
  return [
    thread?.ens,
    thread?.username,
    thread?.participant?.ens,
    thread?.participant?.username,
    thread?.participant?.userId?.ens,
    thread?.participant?.userId?.username,
    thread?.microsite?.ens,
    thread?.microsite?.username,
  ];
}

function isProtectedDirectAgentThread(
  thread: any,
  identity: ProtectedAgentIdentity
) {
  const agentIds = normalizedSet(identity.agentIds);
  if (
    getDirectAgentIdCandidates(thread).some((value) =>
      agentIds.has(normalizeIdentity(value))
    )
  ) {
    return true;
  }

  const names = normalizedSet(identity.directNames);
  if (
    getDirectNameCandidates(thread).some((value) =>
      names.has(normalizeIdentity(value))
    )
  ) {
    return true;
  }

  const handles = compactSet(identity.directHandles);
  return getDirectHandleCandidates(thread).some((value) =>
    handles.has(compactIdentity(value))
  );
}

export function getProtectedAgentThreadLabel(
  thread: any,
  type?: ThreadKind
) {
  const threadKind = resolveThreadKind(thread, type);
  if (!threadKind) return null;

  if (threadKind === 'group') {
    const name = normalizeIdentity(thread?.name || thread?.displayName);
    const identity = PROTECTED_AGENT_IDENTITIES.find(
      (agent) => normalizeIdentity(agent.groupName) === name
    );
    return identity?.label || null;
  }

  const identity = PROTECTED_AGENT_IDENTITIES.find((agent) =>
    isProtectedDirectAgentThread(thread, agent)
  );
  return identity?.label || null;
}

export function getProtectedAgentSearchHint(query?: string | null) {
  const normalizedQuery = normalizeIdentity(query);
  if (!normalizedQuery) return null;

  return (
    PROTECTED_AGENT_IDENTITIES.find((identity) => {
      if (normalizeIdentity(identity.label) === normalizedQuery) return true;
      if (normalizeIdentity(identity.groupName) === normalizedQuery) return true;

      const candidateQuery = compactIdentity(query);
      return (
        normalizedSet(identity.agentIds).has(normalizedQuery) ||
        normalizedSet(identity.directNames).has(normalizedQuery) ||
        compactSet(identity.directHandles).has(candidateQuery)
      );
    }) || null
  );
}
