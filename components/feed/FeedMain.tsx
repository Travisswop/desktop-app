"use client";

import React, {
  Suspense,
  useEffect,
  useState,
  memo,
  useMemo,
  useCallback,
} from "react";
import Feed from "./Feed";
import Timeline from "./Timeline";
import Transaction from "./Transaction";
import { useUser } from "@/lib/UserContext";
import { useSearchParams } from "next/navigation";
import Connections from "./Connections";
import Cookies from "js-cookie";
import { FeedMainComponentLoading } from "../loading/TabSwitcherLoading";
import SpotlightMap from "./SpotlightMap";
import Ledger from "./Ledger";
import PostFeed from "./PostFeed";
import CustomModal from "../modal/CustomModal";
import { useModalStore } from "@/zustandStore/modalstore";

// Constants to avoid duplication
const CONTAINER_HEIGHT = "calc(100vh - 150px)";
const CONTAINER_WIDTH = "w-full sm:w-[520px]";
const AUTH_FALLBACK_DELAY = 300;

type AuthData = {
  userId: string;
  accessToken: string;
};

// Custom hook to manage authentication data
const useAuthData = (userId?: string) => {
  const [authData, setAuthData] = useState<AuthData | null>(null);

  const getTokenFromCookies = useCallback(
    () => Cookies.get("access-token"),
    []
  );

  const initializeAuth = useCallback(() => {
    const token = getTokenFromCookies();
    const cookieUserId = Cookies.get("user-id");

    if (token && cookieUserId) {
      setAuthData({ userId: cookieUserId, accessToken: token });
    } else {
      setAuthData(null);
    }
  }, [getTokenFromCookies]);

  // Initialize auth data once on mount
  useEffect(() => {
    initializeAuth();
    const fallbackTimer = setTimeout(initializeAuth, AUTH_FALLBACK_DELAY);
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
      return smartsite?.profilePic || "";
    }
    return "";
  }, [microsites]);
};

// Memoized right sidebar component to prevent unnecessary rerenders
const RightSidebar = memo(
  ({ accessToken, userId }: { accessToken: string; userId: string }) => {
    // Create stable props for Connections to prevent re-renders
    const connectionsProps = useMemo(
      () => ({
        userId,
        accessToken,
      }),
      [userId, accessToken]
    );

    // Create stable token prop for SpotlightMap
    // const spotlightMapToken = useMemo(() => accessToken, [accessToken]);

    return (
      <div
        style={{ height: CONTAINER_HEIGHT }}
        className="flex-1 overflow-y-auto"
      >
        <SpotlightMap />
        <Connections {...connectionsProps} />
      </div>
    );
  }
);

RightSidebar.displayName = "RightSidebar";

// Separate container for posting state to isolate re-renders
const PostingStateProvider = memo(
  ({
    children,
    onPostingStateChange,
  }: {
    children: (postingState: {
      isPosting: boolean;
      setIsPosting: React.Dispatch<React.SetStateAction<boolean>>;
      isPostLoading: boolean;
      setIsPostLoading: React.Dispatch<React.SetStateAction<boolean>>;
    }) => React.ReactNode;
    onPostingStateChange?: (isPosting: boolean) => void;
  }) => {
    const [isPosting, setIsPosting] = useState(false);
    const [isPostLoading, setIsPostLoading] = useState(false);

    // Notify parent of posting state changes if needed
    useEffect(() => {
      onPostingStateChange?.(isPosting);
    }, [isPosting, onPostingStateChange]);

    const stableSetIsPosting = useCallback(
      (value: boolean | ((prev: boolean) => boolean)) => {
        setIsPosting(value);
      },
      []
    );

    const stableSetIsPostLoading = useCallback(
      (value: boolean | ((prev: boolean) => boolean)) => {
        setIsPostLoading(value);
      },
      []
    );

    return (
      <>
        {children({
          isPosting,
          setIsPosting: stableSetIsPosting,
          isPostLoading,
          setIsPostLoading: stableSetIsPostLoading,
        })}
      </>
    );
  }
);

PostingStateProvider.displayName = "PostingStateProvider";

// Memoized main content area with isolated posting state
const MainContent = memo(
  ({
    userId,
    accessToken,
    primaryMicrositeImg,
    tab,
  }: {
    userId: string;
    accessToken: string;
    primaryMicrositeImg: string;
    tab: string;
  }) => {
    // Component mapping for tab switching - keep static
    const tabComponents = useMemo(
      () => ({
        feed: Feed,
        timeline: Timeline,
        transaction: Transaction,
        ledger: Ledger,
        map: SpotlightMap,
      }),
      []
    );

    // Stable props that don't change with posting state
    const stableProps = useMemo(
      () => ({
        accessToken,
        userId,
      }),
      [accessToken, userId]
    );

    const stablePostFeedProps = useMemo(
      () => ({
        primaryMicrositeImg,
        userId,
        token: accessToken,
      }),
      [primaryMicrositeImg, userId, accessToken]
    );

    return (
      <PostingStateProvider>
        {({ isPosting, setIsPosting, isPostLoading, setIsPostLoading }) => (
          <MainContentInner
            stableProps={stableProps}
            stablePostFeedProps={stablePostFeedProps}
            tabComponents={tabComponents}
            tab={tab}
            isPosting={isPosting}
            setIsPosting={setIsPosting}
            isPostLoading={isPostLoading}
            setIsPostLoading={setIsPostLoading}
          />
        )}
      </PostingStateProvider>
    );
  }
);

MainContent.displayName = "MainContent";

// Separate inner component to handle the posting state props
const MainContentInner = memo(
  ({
    stableProps,
    stablePostFeedProps,
    tabComponents,
    tab,
    isPosting,
    setIsPosting,
    isPostLoading,
    setIsPostLoading,
  }: {
    stableProps: { accessToken: string; userId: string };
    stablePostFeedProps: {
      primaryMicrositeImg: string;
      userId: string;
      token: string;
    };
    tabComponents: { feed: any; timeline: any; transaction: any };
    tab: string;
    isPosting: boolean;
    setIsPosting: React.Dispatch<React.SetStateAction<boolean>>;
    isPostLoading: boolean;
    setIsPostLoading: React.Dispatch<React.SetStateAction<boolean>>;
  }) => {
    const feedComponentProps = useMemo(
      () => ({
        ...stableProps,
        setIsPosting,
        isPosting,
        setIsPostLoading,
        isPostLoading,
      }),
      [stableProps, setIsPosting, isPosting, setIsPostLoading, isPostLoading]
    );

    const postFeedProps = useMemo(
      () => ({
        ...stablePostFeedProps,
        setIsPosting,
        setIsPostLoading,
      }),
      [stablePostFeedProps, setIsPosting, setIsPostLoading]
    );

    const renderComponent = useMemo(() => {
      const Component =
        tabComponents[tab as keyof typeof tabComponents] || Feed;
      return <Component {...feedComponentProps} />;
    }, [tab, tabComponents, feedComponentProps]);

    const { isOpen, closeModal } = useModalStore();

    return (
      <div
        // style={{ height: CONTAINER_HEIGHT }}
        className={`${CONTAINER_WIDTH} overflow-y-auto`}
      >
        {/* post new feed Modal */}
        <CustomModal isOpen={isOpen} onClose={closeModal} title="Create Post">
          <PostFeed {...postFeedProps} />
        </CustomModal>
        {/* <hr /> */}

        <Suspense fallback={<div>Loading feed...</div>}>
          {renderComponent}
        </Suspense>
      </div>
    );
  }
);

MainContentInner.displayName = "MainContentInner";

const FeedMain = memo(() => {
  const { user, loading: userLoading } = useUser();
  const searchParams = useSearchParams();
  const authData = useAuthData(user?._id);
  const { userId, accessToken } = useEffectiveAuth(authData, user);
  const primaryMicrositeImg = usePrimaryMicrositeImg(user?.microsites);

  const tab = useMemo(() => searchParams?.get("tab") || "feed", [searchParams]);

  // Stable props for MainContent
  const mainContentProps = useMemo(
    () => ({
      userId: userId as string,
      accessToken: accessToken as string,
      primaryMicrositeImg: primaryMicrositeImg || "",
      tab,
    }),
    [userId, accessToken, primaryMicrositeImg, tab]
  );

  // Early return with loading state - after all hooks
  if (!userId || !accessToken || userLoading) {
    return (
      <div className="w-full sm:w-[520px] mx-auto">
        <FeedMainComponentLoading />
      </div>
    );
  }

  return (
    <div className="w-full flex h-full justify-center relative">
      <MainContent {...mainContentProps} />
      {/* <RightSidebar {...rightSidebarProps} /> */}
    </div>
  );
});

FeedMain.displayName = "FeedMain";

export default FeedMain;
