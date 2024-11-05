'use client';
import { useRef } from 'react';

export default function VideoPlayer({
  url,
  thumbnail,
}: {
  url: string;
  thumbnail: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="relative aspect-video">
      <video
        ref={videoRef}
        className="w-full h-full"
        poster={thumbnail}
        controls
      >
        <source src={url} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
