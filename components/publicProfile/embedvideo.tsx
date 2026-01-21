"use client";

import { FC, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TikTokEmbed, XEmbed, YouTubeEmbed } from "react-social-media-embed";
import VideoContainer from "./videoContainer";

interface Props {
  data: {
    _id: string;
    micrositeId: string;
    type: string;
    videoUrl: string;
  };
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

const MediaCard: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full overflow-hidden rounded-xl shadow-sm">{children}</div>
);

const AspectWrapper: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative w-full aspect-video bg-black">
    <div className="absolute inset-0">{children}</div>
  </div>
);

const EmbedVideo: FC<Props> = ({ data }) => {
  const { type, videoUrl } = data;
  console.log("embed data", data);

  const [rumbleEmbedUrl, setRumbleEmbedUrl] = useState<string | null>(null);
  const [isLoadingRumble, setIsLoadingRumble] = useState(false);

  console.log("rumbleEmbedUrl", rumbleEmbedUrl);

  const isValidUrl = checkValidUrl(videoUrl);
  const spotifyUrl =
    type === "spotify" && isValidUrl
      ? (() => {
          try {
            const url = new URL(videoUrl);

            // Remove intl paths like /intl-en/
            url.pathname = url.pathname.replace(/\/intl-\w+\//, "/");

            // Convert to embed URL
            return url
              .toString()
              .replace("open.spotify.com", "open.spotify.com/embed");
          } catch {
            return null;
          }
        })()
      : null;

  // Fetch Rumble embed URL
  useEffect(() => {
    if (type === "rumble" && isValidUrl) {
      const url = new URL(videoUrl);

      console.log("hit");

      // Check if it's already an embed URL
      if (url.pathname.includes("/embed/")) {
        setRumbleEmbedUrl(videoUrl);
        return;
      }

      console.log("hit 2");

      // Fetch the correct embed URL from our API
      setIsLoadingRumble(true);
      fetch(`/api/rumble-embed?url=${encodeURIComponent(videoUrl)}`)
        .then((res) => res.json())
        .then((data) => {
          console.log("jumble hola", data);

          if (data.embedUrl) {
            setRumbleEmbedUrl(data.embedUrl);
          }
        })
        .catch((err) => console.error("Error fetching Rumble embed:", err))
        .finally(() => setIsLoadingRumble(false));

      console.log("hit 3");
    }
  }, [type, videoUrl, isValidUrl]);

  const isYouTubeShort = (url: string) =>
    url.includes("/shorts/") || url.includes("youtube.com/shorts");

  return (
    <motion.div
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={variants}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <MediaCard>
        {/* YouTube */}
        {type === "youtube" && (
          <div className={`w-full flex justify-center`}>
            <div
              className={`relative overflow-hidden rounded-xl bg-black ${
                isYouTubeShort(videoUrl)
                  ? "w-full max-w-md h-[600px]"
                  : "w-full aspect-auto"
              }`}
            >
              {isValidUrl ? (
                <YouTubeEmbed
                  url={videoUrl}
                  width="100%"
                  height={isYouTubeShort(videoUrl) ? 600 : "100%"}
                />
              ) : (
                <VideoContainer videoUrl={videoUrl} />
              )}
            </div>
          </div>
        )}

        {/* TikTok */}
        {type === "tiktok" && (
          <AspectWrapper>
            {isValidUrl ? (
              <TikTokEmbed url={videoUrl} />
            ) : (
              <VideoContainer videoUrl={videoUrl} />
            )}
          </AspectWrapper>
        )}

        {/* X / Twitter */}
        {(type === "twitter" || type === "x") && (
          <div>
            {isValidUrl ? (
              <XEmbed url={videoUrl} />
            ) : (
              <VideoContainer videoUrl={videoUrl} />
            )}
          </div>
        )}

        {/* Spotify */}
        {type === "spotify" && (
          <div>
            {spotifyUrl ? (
              <iframe
                src={spotifyUrl}
                className="w-full rounded-lg"
                height={153}
                allow="encrypted-media"
              />
            ) : (
              <VideoContainer videoUrl={videoUrl} />
            )}
          </div>
        )}

        {/* Rumble */}
        {type === "rumble" && (
          <div className="w-full">
            {isLoadingRumble ? (
              <div className="relative w-full h-0 pb-[56.25%] bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              </div>
            ) : rumbleEmbedUrl ? (
              <div className="relative w-full h-0 pb-[56.25%]">
                <iframe
                  src={rumbleEmbedUrl}
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  frameBorder="0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : (
              <AspectWrapper>
                <VideoContainer videoUrl={videoUrl} />
              </AspectWrapper>
            )}
          </div>
        )}

        {/* Fallback */}
        {!["youtube", "tiktok", "twitter", "x", "spotify", "rumble"].includes(
          type,
        ) && (
          <AspectWrapper>
            <VideoContainer videoUrl={videoUrl} />
          </AspectWrapper>
        )}
      </MediaCard>
    </motion.div>
  );
};

export default EmbedVideo;
