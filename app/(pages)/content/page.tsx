'use client';
import ContentInfo from '@/components/content/Content';
import { useDesktopUserData } from '@/components/tanstackQueryApi/getUserData';
import { useUser } from '@/lib/UserContext';
import { useFetchMediaData } from '@/lib/hooks/useFetchMediaData';

const Content: React.FC = () => {
  const { user, loading, accessToken } = useUser();

  const {
    data: desktopData,
    error: desktopError,
    isLoading: isDesktopLoading,
  } = useDesktopUserData(user?._id || '', accessToken || '');

  const audioUrls =
    desktopData?.microsites?.flatMap((microsite: any) =>
      microsite.info?.audio?.length > 0 ? microsite.info.audio : []
    ) || [];

  const videoUrls =
    desktopData?.microsites?.flatMap((microsite: any) =>
      microsite.info.video?.length > 0 ? microsite.info.video : []
    ) || [];

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
