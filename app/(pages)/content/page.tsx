'use client';
import ContentInfo from '@/components/content/Content';
import { useDesktopUserData } from '@/components/tanstackQueryApi/getUserData';
import { useUser } from '@/lib/UserContext';
import { useFetchMediaData } from '@/lib/hooks/useFetchMediaData';
import { useMemo } from 'react';

const Content: React.FC = () => {
  const { user, loading, accessToken } = useUser();

  const {
    data: desktopData,
    error: desktopError,
    isLoading: isDesktopLoading,
  } = useDesktopUserData(user?._id || '', accessToken || '');

  const { audioUrls, videoUrls } = useMemo(() => {
    const audio =
      desktopData?.microsites?.flatMap((microsite: any) =>
        microsite.info?.audio?.length > 0 ? microsite.info.audio : []
      ) || [];

    const video =
      desktopData?.microsites?.flatMap((microsite: any) =>
        microsite.info.video?.length > 0 ? microsite.info.video : []
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

  return (
    <ContentInfo
      audioList={mediaData?.audio}
      videoList={mediaData?.video}
      isLoading={isDesktopLoading || isMediaLoading}
    />
  );
};

export default Content;
