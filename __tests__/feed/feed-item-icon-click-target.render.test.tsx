/**
 * The whole feed card is clickable and opens the post. It skips that when the
 * click landed on something interactive — but the check narrowed the target to
 * HTMLElement, and every icon in the reaction row is an <svg>, which is an
 * SVGElement. Clicking the reply glyph itself therefore counted as a click on
 * the card and navigated away instead of opening the reply composer.
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

// Renders the post body — irrelevant here and pulls in the d3/ESM chart tree.
jest.mock('@/components/feed/FeedPostContent', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/feed/RepostComposer', () => ({
  __esModule: true,
  default: () => null,
}));

// Pulls in the Privy SDK (ESM) through the wallet hooks.
jest.mock('@/components/feed/TipContent', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/actions/postFeed', () => ({
  deleteFeed: jest.fn(),
  postFeed: jest.fn(),
  postFeedLike: jest.fn(),
  postComment: jest.fn(),
}));

jest.mock('gif-picker-react', () => ({
  __esModule: true,
  default: () => null,
  Theme: { LIGHT: 'light' },
  ContentFilter: { high: 'high' },
}));

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import FeedItem from '@/components/feed/FeedItem';

const feed = {
  _id: 'post-1',
  userId: 'author-1',
  createdAt: new Date('2026-08-07T10:00:00Z').toISOString(),
  likeCount: 0,
  commentCount: 0,
  repostCount: 0,
  viewsCount: 0,
  smartsiteDetails: { name: 'Alex Hennigan', ens: 'henni93.swop.id' },
  smartsiteEnsName: 'henni93.swop.id',
  content: { title: 'a post' },
};

beforeEach(() => {
  push.mockClear();
});

describe('feed card click target', () => {
  it('opens the reply composer when the click lands on the icon glyph', async () => {
    render(
      <FeedItem
        feed={feed}
        userId="user-1"
        accessToken="token-1"
        onRepostSuccess={() => {}}
        onDeleteSuccess={() => {}}
      />,
    );

    const replyButton = screen.getByRole('button', { name: 'Reply' });
    const glyph = replyButton.querySelector('svg');
    expect(glyph).not.toBeNull();

    // Click the <svg>, the way a pointer landing on the icon does.
    fireEvent.click(glyph as SVGElement, { bubbles: true });

    expect(await screen.findByText('Send Reply')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('still opens the post when the click lands on the card body', () => {
    render(
      <FeedItem
        feed={feed}
        userId="user-1"
        accessToken="token-1"
        onRepostSuccess={() => {}}
        onDeleteSuccess={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('link', { name: /Open post by/ }));

    expect(push).toHaveBeenCalledWith('/feed/post-1');
  });
});
