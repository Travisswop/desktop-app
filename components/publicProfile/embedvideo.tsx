"use client";

import { FC } from "react";
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

  const isYouTubeShort = (url: string) =>
    url.includes("/shorts/") || url.includes("youtube.com/shorts");

  return (
    <motion.div
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={variants}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="my-4"
    >
      <MediaCard>
        {/* YouTube */}
        {type === "youtube" && (
          <div
            className={`w-full flex justify-center ${
              isYouTubeShort(videoUrl) ? "py-2" : ""
            }`}
          >
            <div
              className={`relative overflow-hidden rounded-xl bg-black ${
                isYouTubeShort(videoUrl)
                  ? "w-full max-w-md h-[600px]"
                  : "w-full aspect-video"
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
          <div className="p-3">
            {isValidUrl ? (
              <XEmbed url={videoUrl} />
            ) : (
              <VideoContainer videoUrl={videoUrl} />
            )}
          </div>
        )}

        {/* Spotify */}
        {type === "spotify" && (
          <div className="p-3">
            {spotifyUrl ? (
              <iframe
                src={spotifyUrl}
                className="w-full rounded-lg"
                height={160}
                allow="encrypted-media"
              />
            ) : (
              <VideoContainer videoUrl={videoUrl} />
            )}
          </div>
        )}

        {/* Fallback */}
        {!["youtube", "tiktok", "twitter", "x", "spotify"].includes(type) && (
          <AspectWrapper>
            <VideoContainer videoUrl={videoUrl} />
          </AspectWrapper>
        )}
      </MediaCard>
    </motion.div>
  );
};

// const EmbedVideo: FC<Props> = ({ data }) => {
//   console.log("embeed data", data);

//   const { type, videoUrl } = data;
//   const isValidUrl = checkValidUrl(videoUrl);
//   let spotifyUrl;

//   if (type === "spotify") {
//     try {
//       const url = new URL(videoUrl);
//       // https://open.spotify.com/playlist/37i9dQZF1DWUACcBjzMiIY?si=DP--7-zwR3CfUURp-xEnuA
//       // Remove any additional path segments
//       url.pathname = url.pathname.replace(/\/intl-\w+\//, "/");
//       // Replace with embed URL
//       spotifyUrl = url
//         .toString()
//         .replace("open.spotify.com", "open.spotify.com/embed");
//     } catch (error) {
//       spotifyUrl = null;
//     }
//   }

//   return (
//     <motion.div
//       initial="hidden"
//       animate="enter"
//       exit="exit"
//       variants={variants}
//       transition={{
//         duration: 0.4,
//         type: "easeInOut",
//       }}
//       className="my-2"
//     >
//       <motion.div
//         transition={{
//           type: "spring",
//           stiffness: 400,
//           damping: 10,
//         }}
//       >
//         {type === "twitter" || type === "x" ? (
//           <div>
//             {isValidUrl ? (
//               <XEmbed url={videoUrl} />
//             ) : (
//               <VideoContainer videoUrl={videoUrl} />
//             )}
//           </div>
//         ) : type === "tiktok" ? (
//           <div>
//             {isValidUrl ? (
//               <TikTokEmbed url={videoUrl} />
//             ) : (
//               <VideoContainer videoUrl={videoUrl} />
//             )}
//           </div>
//         ) : type === "youtube" ? (
//           <div className="w-full max-w-full overflow-hidden flex flex-col bg-white justify-center rounded-lg shadow-2xl">
//             <div className="video-wrapper">
//               {isValidUrl ? (
//                 <YouTubeEmbed url={videoUrl} />
//               ) : (
//                 <VideoContainer videoUrl={videoUrl} />
//               )}
//             </div>
//           </div>
//         ) : type === "spotify" ? (
//           <div className="w-full overflow-hidden flex flex-col  justify-center shadow-2xl">
//             {spotifyUrl ? (
//               <iframe
//                 src={spotifyUrl}
//                 height={400}
//                 allow="encrypted-media"
//               ></iframe>
//             ) : (
//               <VideoContainer videoUrl={videoUrl} />
//             )}
//           </div>
//         ) : (
//           <VideoContainer videoUrl={videoUrl} />
//         )}
//       </motion.div>
//     </motion.div>
//   );
// };

export default EmbedVideo;
