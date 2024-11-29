'use client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Music, User, Volume2 } from 'lucide-react';
import VideoPlayer from './Video';
import AudioPlayer from './Audio';
import { TabsContent } from '@radix-ui/react-tabs';
import { useMemo } from 'react';

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
  type: 'audio';
  author?: string;
  views?: string;
}

interface Video {
  _id: string;
  micrositeId: string;
  active: boolean;
  title: string;
  link: string;
  type: 'video';
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
    <Card key={item._id} className="overflow-hidden">
      <CardContent className="p-0">
        {item.type === 'audio' ? (
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
          item.type === 'video' &&
          item.link && (
            <VideoPlayer
              url={item.link}
              thumbnail="/placeholder.svg"
            />
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

export default function ContentInfo({
  audioList,
  videoList,
  isLoading,
}: {
  audioList: Audio[];
  videoList: Video[];
  isLoading: boolean;
}) {
  const {
    typedAudioList,
    typedVideoList,
    totalAudioStreams,
    totalVideoViews,
  } = useMemo(() => {
    const typedAudio = audioList?.map((audio) => ({
      ...audio,
      type: 'audio' as const,
      author: audio.name || 'Unknown',
      views: `${audio.totalTap || 0}`,
    }));

    const typedVideo = videoList?.map((video) => ({
      ...video,
      type: 'video' as const,
      author: video.title || 'Unknown',
      views: `${video.totalTap || 0}`,
    }));

    const audioStreams =
      typedAudio?.reduce(
        (acc, curr) => acc + (curr.totalTap || 0),
        0
      ) || 'N/A';
    const videoViews =
      typedVideo?.reduce(
        (acc, curr) => acc + (curr.totalTap || 0),
        0
      ) || 'N/A';

    return {
      typedAudioList: typedAudio,
      typedVideoList: typedVideo,
      totalAudioStreams: audioStreams,
      totalVideoViews: videoViews,
    };
  }, [audioList, videoList]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const allContent = [
    ...(typedAudioList || []),
    ...(typedVideoList || []),
  ];

  return (
    <div className="">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">
              Total audio streams
            </p>
            <p className="text-2xl font-bold">{totalAudioStreams}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total video views</p>
            <p className="text-2xl font-bold">{totalVideoViews}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">
              Total video watch time (min)
            </p>
            <p className="text-2xl font-bold">N/A</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="bg-white p-1 mb-6">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-gray-200"
          >
            All Content
          </TabsTrigger>
          <TabsTrigger
            value="audio"
            className="data-[state=active]:bg-gray-200"
          >
            Audio
          </TabsTrigger>
          <TabsTrigger
            value="video"
            className="data-[state=active]:bg-gray-200"
          >
            Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allContent.map((item) => (
              <ContentItem key={item._id} item={item} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audio">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {typedAudioList?.map((item) => (
              <ContentItem key={item._id} item={item} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="video">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {typedVideoList?.map((item) => (
              <ContentItem key={item._id} item={item} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
