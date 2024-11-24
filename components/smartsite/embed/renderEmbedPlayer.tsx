import { FaEdit } from "react-icons/fa";
import { useMemo } from "react";
import TikTokEmbed from "./tiktokEmbed";
import TwitterEmbed from "./twitterEmbed";

interface VideoData {
  _id: string;
  type: "spotify" | "tiktok" | "twitter";
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

const EmbedPlayer: React.FC<EmbedPlayerProps> = ({
  items,
  toggle,
  handleTriggerUpdate,
}) => {
  const renderEmbedPlayer = useMemo(
    () =>
      items.map((videoData: VideoData) => (
        <div key={videoData._id} className="flex items-center gap-2 w-full">
          <div
            className={`w-[96%] ${
              videoData.type === "spotify"
                ? `${
                    !toggle
                      ? "h-[90px] lg:h-[160px] xl:h-[160px] 2xl:h-[240px]"
                      : "h-[100px] lg:h-[160px] 2xl:h-[240px]"
                  }`
                : "h-full"
            } border-4 border-[#c685ff] rounded-2xl overflow-hidden`}
          >
            {videoData.type === "tiktok" ? (
              <TikTokEmbed
                key={videoData.videoUrl}
                embedHtml={videoData.videoUrl}
              />
            ) : videoData.type === "twitter" ? (
              <div className="embed-container">
                <TwitterEmbed
                  key={videoData.videoUrl}
                  embedHtml={videoData.videoUrl}
                />
              </div>
            ) : (
              <div key="embed video" className="embed-responsive">
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: videoData.videoUrl }}
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
              className=""
            >
              <FaEdit size={18} />
            </button>
          </div>
        </div>
      )),
    [handleTriggerUpdate, items, toggle]
  );

  return <>{renderEmbedPlayer}</>;
};

export default EmbedPlayer;
