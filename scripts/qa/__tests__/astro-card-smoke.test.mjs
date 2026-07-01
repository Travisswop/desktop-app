import assert from 'node:assert/strict';
import test from 'node:test';

import targetHelpers from '../astro-card-targets.js';
import { openFreshSwopTarget } from '../astro-card-smoke.mjs';

const {
  findFreshSwopChatTarget,
  listMatchingSwopChatTargets,
  matchesSwopChatUrl,
} = targetHelpers;

test('matches the requested chat route even when query strings or trailing slashes differ', () => {
  const localhostChat = 'http://localhost:3001/dashboard/chat';

  assert.equal(
    matchesSwopChatUrl(
      'http://localhost:3001/dashboard/chat?thread=astro',
      localhostChat
    ),
    true
  );
  assert.equal(
    matchesSwopChatUrl('http://localhost:3001/dashboard/chat/', localhostChat),
    true
  );
});

test('only treats same-origin chat tabs as reusable QA targets', () => {
  const localhostChat = 'http://localhost:3001/dashboard/chat';
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

  assert.deepEqual(
    listMatchingSwopChatTargets(targets, localhostChat).map(
      (target) => target.id
    ),
    ['localhost-chat']
  );
});

test('finds a fresh same-host chat tab instead of falling back to another review host', () => {
  const localhostChat = 'http://localhost:3001/dashboard/chat';
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

  assert.equal(
    findFreshSwopChatTarget(targets, localhostChat, ['stale-localhost-chat'])?.id,
    'fresh-localhost-chat'
  );
});

test('closes stale same-origin chat targets before opening a fresh review tab', async () => {
  const closed = [];
  const result = await openFreshSwopTarget(
    'http://127.0.0.1:9223',
    'http://localhost:3001/dashboard/chat',
    {
      listTargetsImpl: async () => [
        {
          id: 'preview-chat',
          type: 'page',
          url: 'https://desktop-app-git-pr-512-travisswops-projects.vercel.app/dashboard/chat',
          webSocketDebuggerUrl: 'ws://preview',
        },
        {
          id: 'stale-localhost-chat',
          type: 'page',
          url: 'http://localhost:3001/dashboard/chat?thread=astro',
          webSocketDebuggerUrl: 'ws://stale-localhost',
        },
      ],
      openTargetImpl: async () => ({
        id: 'fresh-localhost-chat',
        type: 'page',
        url: 'http://localhost:3001/dashboard/chat',
        webSocketDebuggerUrl: 'ws://fresh-localhost',
      }),
      closeTargetImpl: async (_baseUrl, targetId) => {
        closed.push(targetId);
      },
    }
  );

  assert.deepEqual(closed, ['stale-localhost-chat']);
  assert.deepEqual(result.closedTargets, [
    {
      id: 'stale-localhost-chat',
      url: 'http://localhost:3001/dashboard/chat?thread=astro',
    },
  ]);
  assert.equal(result.reusedExisting, false);
  assert.equal(result.target.id, 'fresh-localhost-chat');
});

test('records fallback when Chrome only exposes an existing same-origin chat target after cleanup', async () => {
  const closed = [];
  let listCall = 0;
  const result = await openFreshSwopTarget(
    'http://127.0.0.1:9223',
    'http://localhost:3001/dashboard/chat',
    {
      listTargetsImpl: async () => {
        listCall += 1;
        if (listCall === 1) {
          return [
            {
              id: 'stale-localhost-chat',
              type: 'page',
              url: 'http://localhost:3001/dashboard/chat?thread=astro',
              webSocketDebuggerUrl: 'ws://stale-localhost',
            },
          ];
        }
        return [
          {
            id: 'stale-localhost-chat',
            type: 'page',
            url: 'http://localhost:3001/dashboard/chat?thread=astro',
            webSocketDebuggerUrl: 'ws://stale-localhost',
          },
        ];
      },
      openTargetImpl: async () => ({}),
      closeTargetImpl: async (_baseUrl, targetId) => {
        closed.push(targetId);
      },
    }
  );

  assert.deepEqual(closed, ['stale-localhost-chat']);
  assert.equal(result.reusedExisting, true);
  assert.equal(result.target.id, 'stale-localhost-chat');
});
