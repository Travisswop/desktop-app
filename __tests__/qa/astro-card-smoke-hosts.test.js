/* eslint-disable @typescript-eslint/no-require-imports */
const {
  classifyAuthHostBlocker,
  isPrivyPreviewHost,
} = require('../../scripts/qa/astro-card-smoke-hosts.js');

describe('astro-card smoke auth host classifier', () => {
  test('flags Privy preview hosts blocked by frame-ancestors', () => {
    const result = classifyAuthHostBlocker({
      requestedUrl:
        'https://desktop-app-git-branch-travisswops-projects.vercel.app/dashboard/chat',
      currentUrl:
        'https://desktop-app-git-branch-travisswops-projects.vercel.app/login',
      pageText: 'Log in to Swop',
      consoleErrors: [
        {
          text: "Framing 'https://privy.swopme.app/' violates the following Content Security Policy directive: frame-ancestors ...",
        },
      ],
    });

    expect(result).toEqual({
      kind: 'privy-preview-host-blocked',
      message: expect.stringContaining('Use an allowed signed-in review host such as localhost'),
    });
  });

  test('flags non-preview origins rejected by Privy allowed origins', () => {
    const result = classifyAuthHostBlocker({
      requestedUrl: 'https://review.swopme.app/dashboard/chat',
      currentUrl: 'https://review.swopme.app/login',
      pageText: 'This app URL is not in Privy allowed origins.',
      consoleErrors: [],
    });

    expect(result).toEqual({
      kind: 'privy-auth-origin-blocked',
      message: expect.stringContaining('Add the host to the Privy app and web client allowed origins'),
    });
  });

  test('does not flag allowed hosts that are simply on login', () => {
    const result = classifyAuthHostBlocker({
      requestedUrl: 'http://127.0.0.1:3001/dashboard/chat',
      currentUrl: 'http://127.0.0.1:3001/login',
      pageText: 'Log in to Swop',
      consoleErrors: [],
    });

    expect(result).toBeNull();
  });

  test('detects preview hosts by domain', () => {
    expect(isPrivyPreviewHost('desktop-app-git-branch-travisswops-projects.vercel.app')).toBe(true);
    expect(isPrivyPreviewHost('www.swopme.app')).toBe(false);
  });
});
