'use client';
import { FC } from 'react';
interface Props {
  videoUrl: string;
}
const VideoContainer: FC<Props> = ({ videoUrl }) => {
  return (
    <div className="w-full max-w-full overflow-hidden flex flex-col justify-center rounded-lg shadow-2xl">
      <div className="video-wrapper">
        <div
          dangerouslySetInnerHTML={{
            __html: videoUrl,
          }}
        ></div>
      </div>
    </div>
  );
};

export default VideoContainer;
