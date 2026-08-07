import targetHelpers from '@/scripts/qa/astro-card-targets.js';

const {
  findFreshSwopChatTarget,
  listMatchingSwopChatTargets,
  matchesSwopChatUrl,
} = targetHelpers;

describe('astro-card target matching', () => {
  const localhostChat = 'http://localhost:3001/dashboard/chat';

  it('matches the requested chat route even when query strings or trailing slashes differ', () => {
    expect(
      matchesSwopChatUrl(
        'http://localhost:3001/dashboard/chat?thread=astro',
        localhostChat
      )
    ).toBe(true);
    expect(
      matchesSwopChatUrl(
        'http://localhost:3001/dashboard/chat/',
        localhostChat
      )
    ).toBe(true);
  });

  it('only treats same-origin chat tabs as reusable QA targets', () => {
    const targets = [
      {
        id: 'preview-chat',
        type: 'page',
        url: 'https://desktop-app-git-pr-512-travisswops-projects.vercel.app/dashboard/chat',
        webSocketDebuggerUrl: 'ws://preview',
      },
      {
        id: 'localhost-chat',
        type: 'page',
        url: 'http://localhost:3001/dashboard/chat?thread=astro',
        webSocketDebuggerUrl: 'ws://localhost',
      },
      {
        id: 'localhost-profile',
        type: 'page',
        url: 'http://localhost:3001/sp/travis',
        webSocketDebuggerUrl: 'ws://profile',
      },
    ];

    expect(
      listMatchingSwopChatTargets(targets, localhostChat).map(
        (target) => target.id
      )
    ).toEqual(['localhost-chat']);
  });

  it('finds a fresh same-host chat tab instead of falling back to another review host', () => {
    const targets = [
      {
        id: 'stale-localhost-chat',
        type: 'page',
        url: 'http://localhost:3001/dashboard/chat',
        webSocketDebuggerUrl: 'ws://stale-localhost',
      },
      {
        id: 'preview-chat',
        type: 'page',
        url: 'https://desktop-app-git-pr-512-travisswops-projects.vercel.app/dashboard/chat',
        webSocketDebuggerUrl: 'ws://preview',
      },
      {
        id: 'fresh-localhost-chat',
        type: 'page',
        url: 'http://localhost:3001/dashboard/chat?thread=goldman',
        webSocketDebuggerUrl: 'ws://fresh-localhost',
      },
    ];

    expect(
      findFreshSwopChatTarget(targets, localhostChat, ['stale-localhost-chat'])
        ?.id
    ).toBe('fresh-localhost-chat');
  });
});
