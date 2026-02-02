"use client";

import Image from "next/image";
import { FaEdit } from "react-icons/fa";

type MediaItem = {
  _id: string;
  link: string;
  title?: string;
};

interface MediaListProps {
  items: MediaItem[];
  getMediaType: (url: string) => "video" | "image" | "unknown";
  fontColor?: string;
  onClick?: (item: MediaItem, index: number) => void;
}

const MediaList = ({
  items,
  getMediaType,
  fontColor,
  onClick,
}: MediaListProps) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="w-full space-y-4">
      {items.map((item, index) => {
        const mediaType = getMediaType(item.link);

        return (
          <div
            key={item._id}
            className={`w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700
              bg-white/70 dark:bg-black/30 shadow-sm relative group`}
          >
            {onClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // important
                  onClick(item, index);
                }}
                className="absolute top-2 right-2 z-10 rounded-md bg-black px-2 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <FaEdit size={16} />
              </button>
            )}
            {/* Media */}
            <div className="relative w-full aspect-video bg-black">
              {mediaType == "video" && (
                <video
                  className="absolute inset-0 h-full w-full object-cover"
                  controls
                  preload="metadata"
                >
                  <source src={item.link} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}

              {mediaType === "image" && (
                <Image
                  src={item.link}
                  alt={item.title || "Media"}
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="object-cover"
                  priority={index === 0}
                />
              )}
            </div>

            {/* Metadata */}
            {item.title && (
              <div className="px-4 py-3">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: fontColor || "#000" }}
                >
                  {item.title}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MediaList;
