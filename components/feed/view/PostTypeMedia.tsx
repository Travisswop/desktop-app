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

  return (
    <div className="w-full">
      {mediaFiles.length > 0 && (
        <div className="mt-2 w-full flex justify-start">
          {mediaFiles.length === 1 && (
            <div
              className={`max-h-[30rem] overflow-hidden rounded-2xl ${
                mediaFiles[0].type === "video" && "w-full"
              }`}
            >
              {mediaFiles[0].type === "image" ||
              mediaFiles[0].type === "photo" ||
              mediaFiles[0].type === "gif" ? (
                <div className="flex items-center justify-center h-full group">
                  <Image
                    src={mediaFiles[0].src.replace(
                      "/upload/",
                      "/upload/f_auto/"
                    )}
                    alt="image"
                    onClick={() => handleOpenImage(mediaFiles[0].src)}
                    width={1800}
                    height={1600}
                    quality={100}
                    priority
                    className={`${
                      isFromRepost
                        ? "max-h-[26rem]"
                        : "min-h-[14rem] max-h-[28rem]"
                    } w-full h-auto cursor-pointer rounded-xl transition-transform duration-300 group-hover:scale-105`}
                  />
                </div>
              ) : (
                <video
                  src={mediaFiles[0].src}
                  controls
                  className={`w-full h-auto ${
                    isFromRepost ? "max-h-[26rem]" : "max-h-[30rem]"
                  } rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]`}
                />
              )}
            </div>
          )}

          {/* {mediaFiles.length === 1 && (
            <div
              className={`relative w-full overflow-hidden rounded-2xl border bg-black/5 ${
                isFromRepost ? "max-h-[26rem]" : "max-h-[30rem]"
              }`}
            >
              {mediaFiles[0].type === "image" ||
              mediaFiles[0].type === "photo" ||
              mediaFiles[0].type === "gif" ? (
                <div className="relative flex items-center justify-center w-full h-full group">
                  <Image
                    src={mediaFiles[0].src.replace(
                      "/upload/",
                      "/upload/f_auto/"
                    )}
                    alt="media"
                    width={1600}
                    height={1600}
                    priority
                    onClick={() => handleOpenImage(mediaFiles[0].src)}
                    className={`w-full h-auto object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105 ${
                      isFromRepost ? "max-h-[26rem]" : "max-h-[30rem]"
                    }`}
                  />
                </div>
              ) : (
                <video
                  src={mediaFiles[0].src}
                  controls
                  playsInline
                  className={`w-full h-auto object-cover rounded-2xl transition-transform duration-300 group-hover:scale-[1.02] ${
                    isFromRepost ? "max-h-[26rem]" : "max-h-[30rem]"
                  }`}
                />
              )}
            </div>
          )} */}

          {/* Display for 2 media items */}
          {/* {mediaFiles.length === 2 && (
            <div className="grid grid-cols-2 gap-1 overflow-hidden relative h-auto sm:h-72 xl:h-[20rem] w-full">
              {mediaFiles.map((file: any, index: number) => (
                <div
                  key={index}
                  className="relative w-full h-full overflow-hidden rounded-xl"
                >
                  {file.type === "image" ||
                  mediaFiles[0].type === "photo" ||
                  file.type === "gif" ? (
                    <Image
                      src={file.src.replace("/upload/", "/upload/f_auto/")}
                      alt="media"
                      fill
                      onClick={() => handleOpenImage(file.src)}
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover cursor-pointer"
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
          )} */}
          {mediaFiles.length === 2 && (
            <div className="grid grid-cols-2 gap-[2px] overflow-hidden border rounded-2xl bg-black/5 h-auto sm:h-80 md:h-96 w-full">
              {mediaFiles.map((file: any, index: number) => (
                <div
                  key={index}
                  className="relative w-full h-full overflow-hidden group"
                >
                  {file.type === "image" ||
                  file.type === "photo" ||
                  file.type === "gif" ? (
                    <Image
                      src={file.src.replace("/upload/", "/upload/f_auto/")}
                      alt={`media-${index}`}
                      fill
                      onClick={() => handleOpenImage(file.src)}
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <video
                      src={file.src}
                      controls
                      playsInline
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Display for 3 media items */}
          {mediaFiles.length === 3 && (
            <div className="w-full grid grid-cols-2 gap-[2px] border rounded-2xl overflow-hidden bg-black/5 h-auto sm:h-80 md:h-96">
              {/* Left large media */}
              <div className="relative col-span-1 h-full overflow-hidden group">
                {mediaFiles[0].type === "image" ||
                mediaFiles[0].type === "photo" ||
                mediaFiles[0].type === "gif" ? (
                  <Image
                    src={mediaFiles[0].src.replace(
                      "/upload/",
                      "/upload/f_auto/"
                    )}
                    alt="media"
                    fill
                    onClick={() => handleOpenImage(mediaFiles[0].src)}
                    className="object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <video
                    src={mediaFiles[0].src}
                    controls
                    playsInline
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>

              {/* Right stacked media */}
              <div className="grid grid-rows-2 gap-[2px] h-full">
                {mediaFiles.slice(1, 3).map((file: any, index: number) => (
                  <div
                    key={index}
                    className="relative h-full overflow-hidden group"
                  >
                    {file.type === "image" ||
                    file.type === "photo" ||
                    file.type === "gif" ? (
                      <Image
                        src={file.src.replace("/upload/", "/upload/f_auto/")}
                        alt="media"
                        fill
                        onClick={() => handleOpenImage(file.src)}
                        className="object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <video
                        src={file.src}
                        controls
                        playsInline
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* {mediaFiles.length === 3 && (
            <div className="w-full grid grid-cols-3 gap-1 border rounded-2xl overflow-hidden relative h-auto sm:h-72 md:h-96">
              {mediaFiles.map((file: any, index: number) => (
                <div
                  key={index}
                  className="relative w-full h-full aspect-[4/3] overflow-hidden"
                >
                  {file.type === "image" ||
                  mediaFiles[0].type === "photo" ||
                  file.type === "gif" ? (
                    <Image
                      src={file.src.replace("/upload/", "/upload/f_auto/")}
                      alt="media"
                      fill
                      onClick={() => handleOpenImage(file.src)}
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover cursor-pointer"
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
          )} */}

          {/* Display for 4 media items */}
          {mediaFiles.length === 4 && (
            <div className="grid grid-cols-2 gap-1 border rounded-2xl overflow-hidden relative h-auto sm:h-72 md:h-96 xl:h-[30rem]">
              {mediaFiles.map((file: any, index: number) => (
                <div
                  key={index}
                  className="relative w-full h-full aspect-[4/3] overflow-hidden"
                >
                  {file.type === "image" ||
                  mediaFiles[0].type === "photo" ||
                  file.type === "gif" ? (
                    <Image
                      src={file.src.replace("/upload/", "/upload/f_auto/")}
                      alt="media"
                      fill
                      onClick={() => handleOpenImage(file.src)}
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover cursor-pointer"
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
          {/* <Reaction /> */}
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
                  // placeholder="blur"
                  // blurDataURL="/images/image_placeholder.png"
                  className="object-contain"
                  // sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
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
