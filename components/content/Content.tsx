import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

import { Music, User, Volume2 } from 'lucide-react';
import VideoPlayer from './Video';
import AudioPlayer from './Audio';
import { TabsContent } from '@radix-ui/react-tabs';

interface ContentItem {
  id: string;
  type: 'audio' | 'video' | 'photo';
  title: string;
  author: string;
  views: string;
  thumbnail?: string;
  mediaUrl?: string;
  showUserGrid?: boolean;
}

const contentItems: ContentItem[] = [
  {
    id: '1',
    type: 'audio',
    title: 'Ed Sheeran - Perfect (Official Music Video)',
    author: 'Travis',
    views: '23k',
    mediaUrl:
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: '2',
    type: 'video',
    title: 'Mountain View',
    author: 'Travis',
    views: '23k',
    thumbnail: '/placeholder.svg?height=200&width=300',
    mediaUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: '3',
    type: 'audio',
    title: 'Imagine Dragons - Believer (Audio)',
    author: 'Emma',
    views: '45k',
    mediaUrl:
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: '4',
    type: 'video',
    title: 'Sunset at the Beach',
    author: 'Sarah',
    views: '67k',
    thumbnail: '/placeholder.svg?height=200&width=300',
    mediaUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },

  {
    id: '6',
    type: 'audio',
    title: 'Coldplay - Fix You (Live)',
    author: 'David',
    views: '89k',
    mediaUrl:
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
  {
    id: '7',
    type: 'video',
    title: 'Cooking Tutorial: Perfect Pasta',
    author: 'Chef Julia',
    views: '34k',
    thumbnail: '/placeholder.svg?height=200&width=300',
    mediaUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },

  {
    id: '9',
    type: 'audio',
    title: 'Podcast: Tech Trends 2024',
    author: 'TechGuru',
    views: '78k',
    mediaUrl:
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  },
  {
    id: '10',
    type: 'video',
    title: 'Yoga for Beginners',
    author: 'Zen Master',
    views: '101k',
    thumbnail: '/placeholder.svg?height=200&width=300',
    mediaUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
  {
    id: '12',
    type: 'audio',
    title: 'Classical Symphony No. 5',
    author: 'Philharmonic Orchestra',
    views: '67k',
    mediaUrl:
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  },
];

export default function ContentInfo() {
  return (
    <div className="">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">
              Total audio streams
            </p>
            <p className="text-2xl font-bold">N/A</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total video views</p>
            <p className="text-2xl font-bold">2.1k</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">
              Total video watch time (min)
            </p>
            <p className="text-2xl font-bold">1.8k</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Filter */}
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
            {contentItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {item.type === 'audio' ? (
                    <div className="p-4 flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Music className="w-8 h-8 text-black" />
                      </div>
                      <h3 className="text-sm font-medium mb-2 line-clamp-2 text-center">
                        {item.title}
                      </h3>
                      {item.mediaUrl && (
                        <AudioPlayer url={item.mediaUrl} />
                      )}
                    </div>
                  ) : (
                    item.type === 'video' &&
                    item.mediaUrl && (
                      <VideoPlayer
                        url={item.mediaUrl}
                        thumbnail={
                          item.thumbnail || '/placeholder.svg'
                        }
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
            ))}
          </div>
        </TabsContent>
        <TabsContent value="audio">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contentItems
              .filter((x) => x.type === 'audio')
              .map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Music className="w-8 h-8 text-black" />
                      </div>
                      <h3 className="text-sm font-medium mb-2 line-clamp-2 text-center">
                        {item.title}
                      </h3>
                      {item.mediaUrl && (
                        <AudioPlayer url={item.mediaUrl} />
                      )}
                    </div>
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
              ))}
          </div>
        </TabsContent>
        <TabsContent value="video">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contentItems
              .filter((x) => x.type === 'video')
              .map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {item.mediaUrl && (
                      <VideoPlayer
                        url={item.mediaUrl}
                        thumbnail={
                          item.thumbnail || '/placeholder.svg'
                        }
                      />
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
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
