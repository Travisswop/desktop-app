"use client";
import React, { useRef, useState } from "react";
import { MdOutlineLocationOn } from "react-icons/md";
import Emoji from "./Emoji";
import GifPickerContent from "./GifPicker";
import Image from "next/image";
import ImageContent from "./ImageSelect";
import { AiOutlineClose } from "react-icons/ai";
import { GrEmoji } from "react-icons/gr";
import { HiOutlineGif } from "react-icons/hi2";
import { motion } from "framer-motion";
import { PiChartBarHorizontalBold } from "react-icons/pi";
import { CharacterCounter } from "./view/CharacterCountCircle";
import feedNft from "@/public/images/feed_nft.png";
import feedAI from "@/public/images/feed_AI.png";

type MediaFile = { type: "image" | "video" | "gif"; src: string };

interface MediaPreviewProps {
  mediaFiles: MediaFile[];
  setMediaFiles: React.Dispatch<React.SetStateAction<MediaFile[]>>;
  setFileError: React.Dispatch<React.SetStateAction<string>>;
  postContent: string;
  onEmojiSelect: (emoji: string) => void;
  onOpenPoll: () => void;
  onOpenMint: () => void;
}

const MediaPreview = ({
  mediaFiles,
  setMediaFiles,
  setFileError,
  postContent,
  onEmojiSelect,
  onOpenPoll,
  onOpenMint,
}: MediaPreviewProps) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const MAX_LENGTH = 2000;

  const handleRemoveMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      {/* Render media files */}
      {mediaFiles.length > 0 && (
        <div className="mt-4 w-full flex justify-center">
          {/* 1 media item */}
          {mediaFiles.length === 1 && (
            <div
              ref={pickerRef}
              className="relative overflow-hidden rounded-2xl w-1/2"
            >
              <button
                onClick={() => handleRemoveMedia(0)}
                className="absolute top-2 right-2 bg-black p-1 rounded-full"
              >
                <AiOutlineClose size={14} color="white" />
              </button>
              {mediaFiles[0].type === "image" ||
              mediaFiles[0].type === "gif" ? (
                <Image
                  src={mediaFiles[0].src}
                  alt="media"
                  width={1600}
                  height={1200}
                  className="w-full h-auto"
                />
              ) : (
                <video
                  src={mediaFiles[0].src}
                  controls
                  className="w-full h-auto max-h-[10rem] rounded-2xl"
                />
              )}
            </div>
          )}

          {/* 2 media items */}
          {mediaFiles.length === 2 && (
            <div
              ref={pickerRef}
              className="w-full grid grid-cols-2 gap-1 overflow-hidden h-[9rem]"
            >
              {mediaFiles.map((file, index) => (
                <div
                  key={index}
                  className="relative w-full h-full overflow-hidden rounded-xl"
                >
                  <button
                    onClick={() => handleRemoveMedia(index)}
                    className="absolute top-2 right-2 bg-black p-1 rounded-full z-10"
                  >
                    <AiOutlineClose size={14} color="white" />
                  </button>
                  {file.type === "image" || file.type === "gif" ? (
                    <Image
                      src={file.src}
                      alt="media"
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <video
                      src={file.src}
                      controls
                      className="object-cover w-full h-full"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 3 media items */}
          {mediaFiles.length === 3 && (
            <div
              ref={pickerRef}
              className="w-full grid grid-cols-3 gap-1 overflow-hidden relative h-[8rem]"
            >
              {mediaFiles.map((file, index) => (
                <div
                  key={index}
                  className="relative w-full h-full overflow-hidden rounded-xl"
                >
                  <button
                    onClick={() => handleRemoveMedia(index)}
                    className="absolute top-2 right-2 bg-black p-1 rounded-full z-10"
                  >
                    <AiOutlineClose size={14} color="white" />
                  </button>
                  {file.type === "image" || file.type === "gif" ? (
                    <Image
                      src={file.src}
                      alt="media"
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <video
                      src={file.src}
                      controls
                      className="object-cover w-full h-full"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 4 media items */}
          {mediaFiles.length === 4 && (
            <div
              ref={pickerRef}
              className="grid w-full grid-cols-2 gap-1 overflow-hidden h-[18rem]"
            >
              {mediaFiles.map((file, index) => (
                <div
                  key={index}
                  className="relative w-full h-full aspect-[4/3] overflow-hidden rounded-xl"
                >
                  <button
                    onClick={() => handleRemoveMedia(index)}
                    className="absolute top-2 right-2 bg-black p-1 rounded-full z-10"
                  >
                    <AiOutlineClose size={14} color="white" />
                  </button>
                  {file.type === "image" || file.type === "gif" ? (
                    <Image
                      src={file.src}
                      alt="media"
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <video
                      src={file.src}
                      controls
                      className="object-cover w-full h-full"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action toolbar */}
      <div className="flex items-center gap-6 w-full justify-center mt-2">
        <ImageContent
          setFileError={setFileError}
          setMediaFiles={setMediaFiles}
          mediaFilesLength={mediaFiles.length}
        />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (mediaFiles.length !== 4) {
              setShowGifPicker(!showGifPicker);
              setShowEmojiPicker(false);
            }
          }}
          className={`${mediaFiles.length > 3 && "cursor-not-allowed disabled"}`}
        >
          <HiOutlineGif
            size={23}
            className={`${
              mediaFiles.length > 3 ? "text-gray-400" : "text-gray-700"
            }`}
          />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenPoll();
          }}
        >
          <PiChartBarHorizontalBold size={22} className="text-gray-800" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowEmojiPicker(!showEmojiPicker);
            setShowGifPicker(false);
          }}
        >
          <GrEmoji size={22} className="text-gray-800" />
        </button>

        <button className="cursor-not-allowed">
          <MdOutlineLocationOn size={24} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenMint();
          }}
          className="w-6 h-auto"
        >
          <Image src={feedNft} alt="nft" />
        </button>

        <button className="w-6 h-auto cursor-not-allowed">
          <Image src={feedAI} alt="AI" />
        </button>

        <CharacterCounter current={postContent.length} max={MAX_LENGTH} />
      </div>

      {/* Emoji / GIF Pickers */}
      <motion.div layout transition={{ duration: 0.28, ease: "easeInOut" }}>
        {showEmojiPicker && (
          <div className="mt-4">
            <Emoji
              onEmojiSelect={onEmojiSelect}
              showEmojiPicker={showEmojiPicker}
              setShowEmojiPicker={setShowEmojiPicker}
            />
          </div>
        )}

        <GifPickerContent
          mediaFilesLength={mediaFiles.length}
          setMediaFiles={setMediaFiles}
          setFileError={setFileError}
          showGifPicker={showGifPicker}
          setShowGifPicker={setShowGifPicker}
        />
      </motion.div>
    </>
  );
};

export default MediaPreview;
