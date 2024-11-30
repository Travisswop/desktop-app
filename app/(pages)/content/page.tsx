'use client';
import ContentInfo from '@/components/content/Content';
import { useDesktopUserData } from '@/components/tanstackQueryApi/getUserData';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/lib/UserContext';
import { useFetchMediaData } from '@/lib/hooks/useFetchMediaData';
import { useMemo } from 'react';

const Content: React.FC = () => {
  const { user, loading: userLoading, accessToken } = useUser();

  const {
    data: desktopData,
    error: desktopError,
    isLoading: isDesktopLoading,
  } = useDesktopUserData(user?._id || '', accessToken || '');

  const { audioUrls, videoUrls } = useMemo(() => {
    // Safely handle potential undefined or null microsites
    const audio =
      desktopData?.microsites?.flatMap((microsite: any) =>
        microsite?.info?.audio?.length > 0 ? microsite.info.audio : []
      ) || [];

    const video =
      desktopData?.microsites?.flatMap((microsite: any) =>
        microsite?.info?.video?.length > 0 ? microsite.info.video : []
      ) || [];

    return { audioUrls: audio, videoUrls: video };
  }, [desktopData?.microsites]);

  const {
    data: mediaData,
    error: mediaError,
    isLoading: isMediaLoading,
  } = useFetchMediaData(
    user?._id || '',
    accessToken || '',
    audioUrls,
    videoUrls
  );

  // Show loading state while initial data is being fetched
  if (userLoading || !user || !accessToken) {
    return <LoadingSkeleton />;
  }

  // More comprehensive loading and error handling
  if (isDesktopLoading || isMediaLoading) {
    return <LoadingSkeleton />;
  }

  // Add error handling
  if (desktopError || mediaError) {
    return (
      <div className="text-red-500 p-4">
        {desktopError?.message ||
          mediaError?.message ||
          'An error occurred'}
      </div>
    );
  }

  // Ensure data exists before rendering
  if (!desktopData || !mediaData) {
    return <LoadingSkeleton />;
  }

  return (
    <ContentInfo
      audioList={mediaData?.audio || []}
      videoList={mediaData?.video || []}
      isLoading={userLoading || isDesktopLoading || isMediaLoading}
    />
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="bg-gray-50">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="h-10 w-72 bg-gray-200 rounded animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-40 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Content;
