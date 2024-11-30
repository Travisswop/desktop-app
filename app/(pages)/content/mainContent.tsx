import ContentInfo from "@/components/content/Content";
import { useDesktopUserData } from "@/components/tanstackQueryApi/getUserData";
import { useFetchMediaData } from "@/lib/hooks/useFetchMediaData";
import React, { useMemo } from "react";

const MainContent = ({ id, token }: any) => {
  const {
    data: desktopData,
    error: desktopError,
    isLoading: isDesktopLoading,
  } = useDesktopUserData(id || "", token || "");

  const { audioUrls, videoUrls } = useMemo(() => {
    const audio =
      (!isDesktopLoading &&
        desktopData?.microsites?.flatMap((microsite: any) =>
          microsite.info?.audio?.length > 0 ? microsite.info.audio : []
        )) ||
      [];

    const video =
      (!isDesktopLoading &&
        desktopData?.microsites?.flatMap((microsite: any) =>
          microsite.info.video?.length > 0 ? microsite.info.video : []
        )) ||
      [];

    return { audioUrls: audio, videoUrls: video };
  }, [desktopData?.microsites, isDesktopLoading]);

  const shouldFetchMediaData = audioUrls.length > 0 || videoUrls.length > 0;

  const {
    data: mediaData,
    error: mediaError,
    isLoading: isMediaLoading,
  } = useFetchMediaData(
    shouldFetchMediaData ? id || "" : null,
    shouldFetchMediaData ? token || "" : null,
    shouldFetchMediaData ? audioUrls : [],
    shouldFetchMediaData ? videoUrls : []
  );

  console.log("audio url", audioUrls);
  console.log("video url", videoUrls);

  return (
    <div>
      <ContentInfo
        audioList={mediaData?.audio}
        videoList={mediaData?.video}
        isLoading={isDesktopLoading || isMediaLoading}
      />
    </div>
  );
};

export default MainContent;
