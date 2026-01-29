"use client";
import {
  Modal,
  ModalBody,
  ModalContent,
  useDisclosure,
} from "@nextui-org/react";
import Image from "next/image";
import React, { useState } from "react";

const PostTypeMedia = ({ mediaFiles, isFromRepost = false }: any) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [image, setImage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const handleOpenImage = (image: string) => {
    setIsLoading(true);
    setImage(image);
    onOpen();
  };

  const renderMedia = (
    file: any,
    index: number,
    singleMedia: boolean = false,
  ) => {
    const isImage =
      file.type === "image" || file.type === "photo" || file.type === "gif";

    if (isImage) {
      return (
        <Image
          src={file.src.replace("/upload/", "/upload/f_auto/")}
          alt={`media-${index}`}
          fill={!singleMedia}
          width={singleMedia ? 1800 : undefined}
          height={singleMedia ? 1600 : undefined}
          quality={100}
          priority={singleMedia}
          onClick={() => handleOpenImage(file.src)}
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
          className={`${
            singleMedia
              ? `${isFromRepost ? "max-h-[26rem]" : "min-h-[14rem] max-h-[28rem]"} w-full h-auto cursor-pointer rounded-xl transition-transform duration-300 group-hover:scale-105`
              : "object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
          }`}
        />
      );
    }

    // Video rendering
    return (
      <video
        key={`video-${index}`}
        src={file.src}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        className={`${
          singleMedia
            ? `w-full h-auto ${isFromRepost ? "max-h-[26rem]" : "max-h-[30rem]"} rounded-2xl`
            : "w-full h-full object-cover"
        } transition-transform duration-300 group-hover:scale-[1.02]`}
        onError={(e) => {
          console.error("Video failed to load:", file.src);
          // Optionally show an error message
          e.currentTarget.style.display = "none";
        }}
      >
        <source src={file.src} type="video/mp4" />
        <source src={file.src} type="video/webm" />
        <source src={file.src} type="video/ogg" />
        Your browser does not support the video tag.
      </video>
    );
  };

  return (
    <div className="w-full">
      {mediaFiles.length > 0 && (
        <div className="mt-2 w-full flex justify-start">
          {/* Single media */}
          {mediaFiles.length === 1 && (
            <div
              className={`max-h-[30rem] overflow-hidden rounded-2xl ${
                mediaFiles[0].type === "video" && "w-full"
              }`}
            >
              <div className="flex items-center justify-center h-full group">
                {renderMedia(mediaFiles[0], 0, true)}
              </div>
            </div>
          )}

          {/* 2 media items */}
          {mediaFiles.length === 2 && (
            <div className="grid grid-cols-2 gap-[2px] overflow-hidden border rounded-2xl bg-black/5 h-auto sm:h-80 md:h-96 w-full">
              {mediaFiles.map((file: any, index: number) => (
                <div
                  key={index}
                  className="relative w-full h-full overflow-hidden group"
                >
                  {renderMedia(file, index)}
                </div>
              ))}
            </div>
          )}

          {/* 3 media items */}
          {mediaFiles.length === 3 && (
            <div className="w-full grid grid-cols-2 gap-[2px] border rounded-2xl overflow-hidden bg-black/5 h-auto sm:h-80 md:h-96">
              {/* Left large media */}
              <div className="relative col-span-1 h-full overflow-hidden group">
                {renderMedia(mediaFiles[0], 0)}
              </div>

              {/* Right stacked media */}
              <div className="grid grid-rows-2 gap-[2px] h-full">
                {mediaFiles.slice(1, 3).map((file: any, index: number) => (
                  <div
                    key={index + 1}
                    className="relative h-full overflow-hidden group"
                  >
                    {renderMedia(file, index + 1)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4 media items */}
          {mediaFiles.length === 4 && (
            <div className="grid grid-cols-2 gap-[2px] border rounded-2xl overflow-hidden relative h-auto sm:h-72 md:h-96 xl:h-[30rem] bg-black/5">
              {mediaFiles.map((file: any, index: number) => (
                <div
                  key={index}
                  className="relative w-full h-full overflow-hidden group"
                >
                  {renderMedia(file, index)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal size="full" isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <ModalBody>
              <div className="relative w-[90vw] h-[90vh] mx-auto my-auto">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                    <span>Loading...</span>
                  </div>
                )}
                <Image
                  src={image.replace("/upload/", "/upload/f_auto/")}
                  alt="feed image"
                  fill
                  className="object-contain"
                  onLoadingComplete={() => setIsLoading(false)}
                />
              </div>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default PostTypeMedia;
