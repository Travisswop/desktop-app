import { FaEdit } from "react-icons/fa";
import { useMemo } from "react";
// import TikTokEmbed from "./tiktokEmbed";
// import TwitterEmbed from "./twitterEmbed";
// import { XEmbed, YouTubeEmbed } from "./customEmbeds"; // Assuming you have these components
import { TikTokEmbed, XEmbed, YouTubeEmbed } from "react-social-media-embed";
import placeholder from "@/public/images/video_player_placeholder.gif";
import Image from "next/image";

interface VideoData {
  _id: string;
  type: "spotify" | "tiktok" | "twitter" | "youtube" | "rumble" | "streamable";
  videoUrl: string;
}

interface EmbedPlayerProps {
  items: VideoData[];
  toggle: boolean;
  handleTriggerUpdate: (args: {
    data: VideoData;
    categoryForTrigger: string;
  }) => void;
}

const modifyEmbedLink = (embedLink: string, width: string, height: string) =>
  embedLink
    .replace(/width="[^"]*"/, `width="${width}"`)
    .replace(/height="[^"]*"/, `height="${height}"`);

const EmbedPlayer: React.FC<EmbedPlayerProps> = ({
  items,
  toggle,
  handleTriggerUpdate,
}) => {
  const renderEmbedPlayer = useMemo(
    () =>
      items.map((videoData: VideoData) => (
        <div key={videoData._id} className="flex items-center w-full">
          <div
            className={`w-[96%] ${
              videoData.type === "spotify"
                ? `${
                    !toggle
                      ? "h-[90px] lg:h-[160px] xl:h-[160px] 2xl:h-[240px]"
                      : "h-[100px] lg:h-[160px] 2xl:h-[240px]"
                  }`
                : "h-full"
            } rounded-2xl overflow-hidden shadow-small`}
          >
            {videoData.type === "spotify" ? (
              <iframe
                src={videoData.videoUrl}
                width="100%"
                height="100%"
                style={{ borderRadius: "12px" }}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              ></iframe>
            ) : videoData.type === "tiktok" ? (
              <TikTokEmbed
                url={videoData.videoUrl}
                width={"100%"}
                height={500}
              />
            ) : videoData.type === "twitter" ? (
              <XEmbed height={500} url={videoData.videoUrl} />
            ) : videoData.type === "youtube" ? (
              <YouTubeEmbed
                url={videoData.videoUrl}
                width={"100%"}
                height={300}
              />
            ) : videoData.type === "rumble" ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: modifyEmbedLink(videoData.videoUrl, "100%", "360"),
                }}
              ></div>
            ) : videoData.type === "streamable" ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: videoData.videoUrl,
                }}
                className="w-full h-full"
              ></div>
            ) : (
              <div className="relative w-full h-80">
                <Image
                  src={placeholder}
                  alt="Placeholder"
                  fill
                  className="w-full h-full rounded-lg object-contain"
                />
              </div>
            )}
          </div>
          <div className="w-[4%]">
            <button
              onClick={() =>
                handleTriggerUpdate({
                  data: videoData,
                  categoryForTrigger: "embed",
                })
              }
              className="translate-x-1"
            >
              <FaEdit size={16} />
            </button>
          </div>
        </div>
      )),
    [handleTriggerUpdate, items, toggle]
  );

  return <>{renderEmbedPlayer}</>;
};

export default EmbedPlayer;
