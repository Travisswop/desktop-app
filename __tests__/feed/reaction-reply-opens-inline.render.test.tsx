/**
 * The comment/reply button used to `router.push('/feed/<id>#comments')` from
 * the main feed instead of opening a composer. The destination looks almost
 * identical to the feed card you clicked and has no reply box of its own, so
 * the click read as "nothing happened". It now opens the reply composer in
 * place, on the feed and on the post page alike.
 *
 * @jest-environment jsdom
 */
const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/UserContext', () => ({
  useUser: () => ({
    user: { _id: 'user-1', primaryMicrosite: 'site-1', microsites: [] },
  }),
}));

// gif-picker-react ships a CSS import that jest can't transform.
jest.mock('gif-picker-react', () => ({
  __esModule: true,
  default: () => null,
  Theme: { LIGHT: 'light' },
  ContentFilter: { high: 'high' },
}));

// Irrelevant to replying, and it drags in the whole feed-card tree (d3/ESM).
jest.mock('@/components/feed/RepostComposer', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/actions/postFeed', () => ({
  deleteFeed: jest.fn(),
  postFeed: jest.fn(),
  postFeedLike: jest.fn(),
  postComment: jest.fn(),
}));

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import Reaction from '@/components/feed/view/Reaction';

const feed = {
  _id: 'post-1',
  createdAt: new Date('2026-08-07T10:00:00Z').toISOString(),
  smartsiteDetails: { name: 'Alex Hennigan', ens: 'henni93.swop.id' },
  content: { title: 'a post' },
};

const renderReaction = (isFromFeedDetailsPage: boolean) =>
  render(
    <Reaction
      postId="post-1"
      likeCount={0}
      commentCount={0}
      repostCount={0}
      viewsCount={0}
      feed={feed}
      isFromFeedDetailsPage={isFromFeedDetailsPage}
    />,
  );

beforeEach(() => {
  push.mockClear();
});

describe('feed reply button', () => {
  it.each([
    ['the main feed', false],
    ['the post detail page', true],
  ])('opens the reply composer in place from %s', async (_label, onDetails) => {
    renderReaction(onDetails as boolean);

    fireEvent.click(screen.getByRole('button', { name: /reply/i }));

    expect(await screen.findByText('Send Reply')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Post your reply...'),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
