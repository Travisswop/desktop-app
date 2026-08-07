/**
 * The post page had no reply composer at all — its empty state ("Be the first
 * to reply") was inert text, so the only way to comment was to know that the
 * small icon in the reaction row had to be clicked a second time. The composer
 * now sits above the comment list, the way every other thread view works.
 *
 * @jest-environment jsdom
 */
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/lib/UserContext', () => ({
  useUser: () => ({
    user: { _id: 'user-1', primaryMicrosite: 'site-1', microsites: [] },
  }),
}));

// Drags in the whole feed-card tree (d3/ESM) and is not under test here.
jest.mock('@/components/feed/FeedItem', () => ({
  __esModule: true,
  default: () => null,
}));

// Server actions — they import next/cache, which needs a server runtime.
jest.mock('@/actions/postFeed', () => ({
  postComment: jest.fn(),
  postFeed: jest.fn(),
  postFeedLike: jest.fn(),
  deleteFeed: jest.fn(),
}));

jest.mock('@/components/feed/CommentItem', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('gif-picker-react', () => ({
  __esModule: true,
  default: () => null,
  Theme: { LIGHT: 'light' },
  ContentFilter: { high: 'high' },
}));

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import FeedDetailsClient from '@/components/feed/FeedDetailsClient';

const feedData = {
  _id: 'post-1',
  commentCount: 0,
  createdAt: new Date('2026-08-07T10:00:00Z').toISOString(),
  smartsiteDetails: { name: 'Alex Hennigan', ens: 'henni93.swop.id' },
};

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ comments: [], total: 0, totalPages: 1 }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('post detail page', () => {
  it('renders a reply composer for a signed-in viewer', async () => {
    render(
      <FeedDetailsClient
        feedData={feedData}
        userId="user-1"
        accessToken="token-1"
      />,
    );

    expect(
      await screen.findByPlaceholderText('Post your reply...'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument();
  });
});
