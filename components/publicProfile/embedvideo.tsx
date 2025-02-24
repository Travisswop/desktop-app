'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';
import {
  TikTokEmbed,
  XEmbed,
  YouTubeEmbed,
} from 'react-social-media-embed';
import VideoContainer from './videoContainer';

interface Props {
  data: {
    _id: string;
    micrositeId: string;
    type: string;
    videoUrl: string;
  };
  socialType: string;
  parentId: string;
  number: number;
}

const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};

const checkValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

const EmbedVideo: FC<Props> = async ({ data, number }) => {
  const { type, videoUrl } = data;
  const isValidUrl = checkValidUrl(videoUrl);
  let spotifyUrl;

  if (type === 'spotify') {
    try {
      const url = new URL(videoUrl);
      // https://open.spotify.com/playlist/37i9dQZF1DWUACcBjzMiIY?si=DP--7-zwR3CfUURp-xEnuA
      // Remove any additional path segments
      url.pathname = url.pathname.replace(/\/intl-\w+\//, '/');
      // Replace with embed URL
      spotifyUrl = url
        .toString()
        .replace('open.spotify.com', 'open.spotify.com/embed');
    } catch (error) {
      spotifyUrl = null;
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={variants}
      transition={{
        duration: 0.4,
        type: 'easeInOut',
      }}
      className="my-2"
    >
      <motion.div
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 10,
        }}
      >
        {type === 'twitter' || type === 'x' ? (
          <div>
            {isValidUrl ? (
              <XEmbed url={videoUrl} />
            ) : (
              <VideoContainer videoUrl={videoUrl} />
            )}
          </div>
        ) : type === 'tiktok' ? (
          <div>
            {isValidUrl ? (
              <TikTokEmbed url={videoUrl} />
            ) : (
              <VideoContainer videoUrl={videoUrl} />
            )}
          </div>
        ) : type === 'youtube' ? (
          <div className="w-full max-w-full overflow-hidden flex flex-col bg-white justify-center rounded-lg shadow-2xl">
            <div className="video-wrapper">
              {isValidUrl ? (
                <YouTubeEmbed url={videoUrl} />
              ) : (
                <VideoContainer videoUrl={videoUrl} />
              )}
            </div>
          </div>
        ) : type === 'spotify' ? (
          <div className="w-full overflow-hidden flex flex-col  justify-center shadow-2xl">
            {spotifyUrl ? (
              <iframe
                src={spotifyUrl}
                height={400}
                allow="encrypted-media"
              ></iframe>
            ) : (
              <VideoContainer videoUrl={videoUrl} />
            )}
          </div>
        ) : (
          <VideoContainer videoUrl={videoUrl} />
        )}
      </motion.div>
    </motion.div>
  );
};

export default EmbedVideo;
