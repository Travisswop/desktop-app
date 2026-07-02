import { mkdtemp, mkdir, readFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';
import { POST as postFeedCardHealth } from '@/app/api/feed/card-health/route';

describe('feed card health route', () => {
  const originalLogPath = process.env.SWOP_FEED_CARD_HEALTH_LOG_PATH;
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'feed-card-health-route-'));
  });

  afterEach(async () => {
    if (originalLogPath === undefined) {
      delete process.env.SWOP_FEED_CARD_HEALTH_LOG_PATH;
    } else {
      process.env.SWOP_FEED_CARD_HEALTH_LOG_PATH = originalLogPath;
    }

    if (tempDir) {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it('rejects unauthenticated callers', async () => {
    const response = await postFeedCardHealth(
      new NextRequest('https://www.swopme.app/api/feed/card-health', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://www.swopme.app',
        },
        body: JSON.stringify({
          surface: 'perps',
          fingerprint: 'perps-stale-open-after-terminal-fill',
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it('rejects untrusted origins', async () => {
    const response = await postFeedCardHealth(
      new NextRequest('https://www.swopme.app/api/feed/card-health', {
        method: 'POST',
        headers: {
          authorization: 'Bearer token-123',
          cookie: 'access-token=token-123; user-id=user-123',
          'content-type': 'application/json',
          origin: 'https://evil.example',
        },
        body: JSON.stringify({
          surface: 'perps',
          fingerprint: 'perps-stale-open-after-terminal-fill',
        }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it('writes sanitized events for trusted authenticated callers', async () => {
    const logPath = path.join(tempDir, 'desktop-feed-card-health.ndjson');
    process.env.SWOP_FEED_CARD_HEALTH_LOG_PATH = logPath;

    const response = await postFeedCardHealth(
      new NextRequest('https://www.swopme.app/api/feed/card-health', {
        method: 'POST',
        headers: {
          authorization: 'Bearer token-123',
          cookie: 'access-token=token-123; user-id=user-123',
          'content-type': 'application/json',
          origin: 'https://www.swopme.app',
        },
        body: JSON.stringify({
          surface: 'perps',
          fingerprint: 'perps-stale-open-after-terminal-fill',
          positionKeys: ['a', 'b'],
          coins: ['ETH'],
          context: {
            activePositionKeyCount: 0,
            authorization: 'secret-token',
          },
        }),
      }),
    );

    expect(response.status).toBe(200);

    const contents = await readFile(logPath, 'utf8');
    const event = JSON.parse(contents.trim());

    expect(event.userId).toBe('user-123');
    expect(event.payload).toEqual({
      surface: 'perps',
      fingerprint: 'perps-stale-open-after-terminal-fill',
      positionKeys: ['a', 'b'],
      coins: ['ETH'],
      context: {
        activePositionKeyCount: 0,
        authorization: '[redacted]',
      },
    });
  });

  it('returns a caller-visible error when local append fails', async () => {
    const logDir = path.join(tempDir, 'logs');
    await mkdir(logDir, { recursive: true });
    process.env.SWOP_FEED_CARD_HEALTH_LOG_PATH = logDir;

    const response = await postFeedCardHealth(
      new NextRequest('https://www.swopme.app/api/feed/card-health', {
        method: 'POST',
        headers: {
          authorization: 'Bearer token-123',
          cookie: 'access-token=token-123; user-id=user-123',
          'content-type': 'application/json',
          origin: 'https://www.swopme.app',
        },
        body: JSON.stringify({
          surface: 'perps',
          fingerprint: 'perps-stale-open-after-terminal-fill',
        }),
      }),
    );

    expect(response.status).toBe(503);
  });
});
