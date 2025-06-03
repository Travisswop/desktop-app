'use client';

import React, {
  Suspense,
  useEffect,
  useState,
  memo,
  useMemo,
  useCallback,
} from 'react';
import Feed from './Feed';
import Timeline from './Timeline';
import Transaction from './Transaction';
import PostFeed from './PostFeed';
import { useUser } from '@/lib/UserContext';
import { useSearchParams } from 'next/navigation';
import Connections from './Connections';
import Cookies from 'js-cookie';
import { FeedHomepageLoading } from '../loading/TabSwitcherLoading';
import SpotlightMap from './SpotlightMap';

// Constants to avoid duplication
const CONTAINER_HEIGHT = 'calc(100vh - 108px)';
const CONTAINER_WIDTH = 'w-3/5 xl:w-2/3 2xl:w-[54%]';
const AUTH_FALLBACK_DELAY = 300;

type AuthData = {
  userId: string;
  accessToken: string;
};

interface FeedMainProps {
  isFromHome?: boolean;
}

// Custom hook to manage authentication data
const useAuthData = (userId?: string) => {
  const [authData, setAuthData] = useState<AuthData | null>(null);

  const getTokenFromCookies = useCallback(
    () => Cookies.get('access-token'),
    []
  );

  const initializeAuth = useCallback(() => {
    const token = getTokenFromCookies();
    const cookieUserId = Cookies.get('user-id');

    if (token && cookieUserId) {
      setAuthData({ userId: cookieUserId, accessToken: token });
    } else {
      setAuthData(null);
    }
  }, [getTokenFromCookies]);

  // Initialize auth data once on mount
  useEffect(() => {
    initializeAuth();
    const fallbackTimer = setTimeout(
      initializeAuth,
      AUTH_FALLBACK_DELAY
    );
    return () => clearTimeout(fallbackTimer);
  }, [initializeAuth]);

  // Sync with user context when user changes
  useEffect(() => {
    if (userId && (!authData?.userId || authData.userId !== userId)) {
      const token = getTokenFromCookies();
      if (token) {
        setAuthData({ userId, accessToken: token });
      }
    }
  }, [userId, authData?.userId, getTokenFromCookies]);

  return authData;
};

// Custom hook for derived auth values
const useEffectiveAuth = (authData: AuthData | null, user: any) => {
  return useMemo(
    () => ({
      userId: authData?.userId || user?._id,
      accessToken: authData?.accessToken,
    }),
    [authData?.userId, authData?.accessToken, user?._id]
  );
};

// Custom hook for primary microsite image
const usePrimaryMicrositeImg = (microsites?: any[]) => {
  return useMemo(() => {
    if (microsites && microsites.length > 0) {
      const smartsite = microsites.find((m: any) => m.primary);
      return smartsite?.profilePic || '';
    }
    return '';
  }, [microsites]);
};

const FeedMain = memo(({ isFromHome = false }: FeedMainProps) => {
  const [isPosting, setIsPosting] = useState(false);
  const [isPostLoading, setIsPostLoading] = useState(false);

  const { user, loading: userLoading } = useUser();
  const searchParams = useSearchParams();
  const authData = useAuthData(user?._id);
  const { userId, accessToken } = useEffectiveAuth(authData, user);
  const primaryMicrositeImg = usePrimaryMicrositeImg(
    user?.microsites
  );

  const tab = useMemo(
    () => searchParams?.get('tab') || 'feed',
    [searchParams]
  );

  // Centralized props for feed components
  const feedComponentProps = useMemo(
    () => ({
      accessToken: accessToken!,
      userId: userId!,
      setIsPosting,
      isPosting,
      setIsPostLoading,
      isPostLoading,
    }),
    [accessToken, userId, isPosting, isPostLoading]
  );

  const postFeedProps = useMemo(
    () => ({
      primaryMicrositeImg,
      userId: userId!,
      token: accessToken!,
      setIsPosting,
      setIsPostLoading,
    }),
    [primaryMicrositeImg, userId, accessToken]
  );

  const connectionsProps = useMemo(
    () => ({
      userId: userId!,
      accessToken: accessToken!,
    }),
    [userId, accessToken]
  );

  // Component mapping for tab switching
  const tabComponents = useMemo(
    () => ({
      feed: Feed,
      timeline: Timeline,
      transaction: Transaction,
    }),
    []
  );

  const renderComponent = useMemo(() => {
    const Component =
      tabComponents[tab as keyof typeof tabComponents] || Feed;
    return <Component {...feedComponentProps} />;
  }, [tab, tabComponents, feedComponentProps]);

  // Early return with loading state
  if (!userId || !accessToken || userLoading) {
    return <FeedHomepageLoading />;
  }

  return (
    <div className="w-full flex relative">
      <div
        style={{ height: CONTAINER_HEIGHT }}
        className={`${CONTAINER_WIDTH} overflow-y-auto`}
      >
        <PostFeed {...postFeedProps} />
        <hr />

        <Suspense fallback={<div>Loading feed...</div>}>
          <section className="p-6">{renderComponent}</section>
        </Suspense>
      </div>

      <div
        style={{ height: CONTAINER_HEIGHT }}
        className="flex-1 overflow-y-auto"
      >
        <SpotlightMap token={accessToken} />
        <Connections {...connectionsProps} />
      </div>
    </div>
  );
});

FeedMain.displayName = 'FeedMain';

export default FeedMain;
