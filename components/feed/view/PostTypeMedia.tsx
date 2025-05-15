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

  console.log("isFromRepost", isFromRepost);

  return (
    <div className="">
      {mediaFiles.length > 0 && (
        <div className="mt-2 w-full flex justify-center">
          {mediaFiles.length === 1 && (
            <div className={`max-h-[30rem] overflow-hidden rounded-2xl w-max`}>
              {mediaFiles[0].type === "image" ||
              mediaFiles[0].type === "photo" ||
              mediaFiles[0].type === "gif" ? (
                <div className="flex items-center justify-center h-full">
                  <Image
                    src={mediaFiles[0].src}
                    alt="media"
                    onClick={() => handleOpenImage(mediaFiles[0].src)}
                    width={1600}
                    height={1600}
                    className={`object-contain ${
                      isFromRepost ? "max-h-[26rem]" : "max-h-[30rem]"
                    }  w-auto cursor-pointer`}
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                    }}
                  />
                </div>
              ) : (
                <video
                  src={mediaFiles[0].src}
                  controls
                  className={`w-full h-auto ${
                    isFromRepost ? "max-h-[26rem]" : "max-h-[30rem]"
                  } rounded-2xl`}
                />
              )}
            </div>
          )}

          {/* Display for 2 media items */}
          {mediaFiles.length === 2 && (
            <div className="grid grid-cols-2 gap-1 border rounded-2xl overflow-hidden relative h-auto sm:h-72 md:h-96 xl:h-[28rem]">
              {mediaFiles.map((file: any, index: number) => (
                <div
                  key={index}
                  className="relative w-full h-full aspect-[4/3] overflow-hidden"
                >
                  {file.type === "image" ||
                  mediaFiles[0].type === "photo" ||
                  file.type === "gif" ? (
                    <Image
                      src={file.src}
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

          {/* Display for 3 media items */}
          {mediaFiles.length === 3 && (
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
                      src={file.src}
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
                      src={file.src}
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
                  src={image}
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
