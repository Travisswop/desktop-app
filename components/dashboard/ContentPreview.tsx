"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Music, User, Volume2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useUser } from "@/lib/UserContext";
import { useDesktopUserData } from "@/components/tanstackQueryApi/getUserData";
import { useFetchMediaData } from "@/lib/hooks/useFetchMediaData";
import AudioPlayer from "../content/Audio";
import VideoPlayer from "../content/Video";
import { PrimaryButton } from "../ui/Button/PrimaryButton";

interface Audio {
  _id: string;
  micrositeId: string;
  active: boolean;
  name: string;
  coverPhoto: string;
  fileUrl: string;
  totalTap: number;
  createdAt: string;
  updatedAt: string;
  type: "audio";
  author?: string;
  views?: string;
}

interface Video {
  _id: string;
  micrositeId: string;
  active: boolean;
  title: string;
  link: string;
  type: "video";
  totalTap: number;
  createdAt: string;
  updatedAt: string;
  author?: string;
  views?: string;
}

interface ContentItemProps {
  item: Audio | Video;
}

const ContentItem = ({ item }: ContentItemProps) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {item.type === "audio" ? (
          <div className="p-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Music className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-sm font-medium mb-2 line-clamp-2 text-center">
              {item.name}
            </h3>
            {item.fileUrl && <AudioPlayer url={item.fileUrl} />}
          </div>
        ) : (
          item.type === "video" &&
          item.link && (
            <VideoPlayer url={item.link} thumbnail="/placeholder.svg" />
          )
        )}
        <div className="p-4">
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <User className="w-4 h-4 fill-black" />
              <span>{item.author}</span>
            </div>
            <div className="flex items-center">
              <Volume2 className="w-4 h-4 fill-black" />
              <span>{item.views}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
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

export default function DashboardContentPreview() {
  // Get user data from context
  const { user, loading: userLoading, accessToken } = useUser();

  // Fetch desktop user data
  const {
    data: desktopData,
    error: desktopError,
    isLoading: isDesktopLoading,
  } = useDesktopUserData(user?._id || "", accessToken || "");

  // Extract audio and video URLs from microsites
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

  // Determine if we should fetch media data
  const shouldFetchMediaData = audioUrls.length > 0 || videoUrls.length > 0;

  // Fetch media data
  const {
    data: mediaData,
    error: mediaError,
    isLoading: isMediaLoading,
  } = useFetchMediaData(
    shouldFetchMediaData ? user?._id || "" : null,
    shouldFetchMediaData ? accessToken || "" : null,
    shouldFetchMediaData ? audioUrls : [],
    shouldFetchMediaData ? videoUrls : []
  );

  // Process content to get top 3
  const { topContent, totalContent } = useMemo(() => {
    const typedAudio =
      mediaData?.audio?.map((audio: any) => ({
        ...audio,
        type: "audio" as const,
        author: audio.name || "Unknown",
        views: `${audio.totalTap || 0}`,
      })) || [];

    const typedVideo =
      mediaData?.video?.map((video: any) => ({
        ...video,
        type: "video" as const,
        author: video.title || "Unknown",
        views: `${video.totalTap || 0}`,
      })) || [];

    // Combine and sort by totalTap (most viewed/played first)
    const allContent = [...typedAudio, ...typedVideo].sort(
      (a, b) => b.totalTap - a.totalTap
    );

    // Get top 3
    const top3 = allContent.slice(0, 3);

    return {
      topContent: top3,
      totalContent: allContent.length,
    };
  }, [mediaData]);

  // Show loading state
  if (userLoading || isDesktopLoading || isMediaLoading) {
    return <LoadingSkeleton />;
  }

  // Show empty state if no content
  if (topContent.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Content</h2>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No content available yet
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Content</h2>
        <Link href="/content">
          <PrimaryButton className="text-sm">View</PrimaryButton>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topContent.map((item) => (
          <ContentItem key={item._id} item={item} />
        ))}
      </div>

      {totalContent > 3 && (
        <div className="text-center pt-2">
          <p className="text-sm text-gray-600">
            Showing 3 of {totalContent} items
          </p>
        </div>
      )}
    </div>
  );
}
