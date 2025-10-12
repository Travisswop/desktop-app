"use client";
import React, { useEffect, useState } from "react";
import { MdOutlineDateRange, MdOutlineLocationOn } from "react-icons/md";
import Emoji from "./Emoji";
import GifPickerContent from "./GifPicker";
import Image from "next/image";
import ImageContent from "./ImageSelect";
import { AiOutlineClose } from "react-icons/ai"; // Icon for close button
import { Spinner } from "@nextui-org/react";
import { postFeed } from "@/actions/postFeed";
import { useUser } from "@/lib/UserContext";
import DynamicPrimaryBtn from "../ui/Button/DynamicPrimaryBtn";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import { sendCloudinaryVideo } from "@/lib/sendCloudinaryVideo";
import UserImageAvatar from "../util/Avatar";
import isUrl from "@/lib/isUrl";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useModalStore } from "@/zustandStore/modalstore";
import { GrEmoji } from "react-icons/gr";

const PostFeed = ({
  primaryMicrositeImg,
  userId,
  token,
  setIsPosting,
  setIsPostLoading,
}: {
  userId: string;
  primaryMicrositeImg: string;
  token: string;
  setIsPosting: any;
  setIsPostLoading: any;
}) => {
  const { user }: any = useUser();
  const router = useRouter();
  const { closeModal } = useModalStore();
  const [postLoading, setPostLoading] = useState<boolean>(false);
  const [primaryMicrosite, setPrimaryMicrosite] = useState<string>("");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // console.log("user123", user);

  const [primaryMicrositeDetails, setPrimaryMicrositeDetails] =
    useState<any>(null);

  // console.log("primaryMicrositeDetails", primaryMicrositeDetails);

  const [postContent, setPostContent] = useState<string>("");
  const [fileError, setFileError] = useState<string>("");
  const [mediaFiles, setMediaFiles] = useState<
    { type: "image" | "video" | "gif"; src: string }[]
  >([]);
  const [error, setError] = useState("");

  // Callback function to handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setPostContent((prevContent) => prevContent + emoji);
  };

  // Callback function to handle emoji selection
  // const handleEmojiSelect = (emojiData: EmojiClickData) => {
  //   setPostContent((prevContent) => prevContent + emojiData.emoji);
  // };

  useEffect(() => {
    if (fileError) {
      // toast({
      //   title: "Error",
      //   description: fileError,
      // });
      toast.error(fileError);
    }
  }, [fileError]);

  useEffect(() => {
    if (!user) return;

    // Set primary microsite ID (or whatever type it is)
    setPrimaryMicrosite(user.primaryMicrosite);

    // Find full microsite object that’s marked as primary
    const primaryMicrosite = user.microsites?.find((m: any) => m?.primary);

    setPrimaryMicrositeDetails(primaryMicrosite);
  }, [user]);

  // Function to remove media item
  const handleRemoveMedia = (index: number) => {
    setMediaFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleFeedPosting = async () => {
    try {
      setPostLoading(true);
      setIsPostLoading(true);
      const updatedMediaFiles = await Promise.all(
        mediaFiles.map(async (file) => {
          if (file.type === "image") {
            const imageUrl = await sendCloudinaryImage(file.src);
            return { type: "image", src: imageUrl };
          } else if (file.type === "video") {
            const videoUrl = await sendCloudinaryVideo(file.src);
            return { type: "video", src: videoUrl };
          } else {
            // If it's a GIF or another type, keep the original URL
            return file;
          }
        })
      );
      // console.log("updatedMediaFiles", updatedMediaFiles);

      const payload = {
        smartsiteId: primaryMicrosite,
        userId: userId,
        postType: "post",
        content: {
          title: postContent,
          post_content: updatedMediaFiles,
        },
      };
      // console.log("feed post payload", payload);

      const data = await postFeed(payload, token);
      // console.log("feed post response", data);

      if (data?.state === "success") {
        toast.success("You posted successfully!");
        setMediaFiles([]);
        setPostContent("");
        setIsPosting(true);
        router.push("/?tab=feed");
        closeModal();
      }
      if (data?.state === "not-allowed") {
        // toast({
        //   title: "Error",
        //   description: "You not allowed to create feed post!",
        // });
        toast.error("You not allowed to create feed post!");
      }
      // console.log("payload", payload);
      // console.log("data", data);
    } catch (error) {
      console.error(error);
    } finally {
      setPostLoading(false);
    }
  };

  const MAX_LENGTH = 512;

  const handlePostChange = (e: any) => {
    const value = e.target.value;

    // Check if the content length exceeds the max length
    if (value.length > MAX_LENGTH) {
      setError(`** Comment cannot exceed ${MAX_LENGTH} characters.`);
    } else {
      setError("");
    }

    setPostContent(value);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <UserImageAvatar
            src={
              isUrl(primaryMicrositeImg)
                ? primaryMicrositeImg
                : `/images/user_avator/${primaryMicrositeImg}.png`
            }
          />
          <div>
            <p className="font-medium">
              {primaryMicrositeDetails && primaryMicrositeDetails.name}
            </p>
            <p className="text-sm text-gray-700">
              {(primaryMicrositeDetails && primaryMicrositeDetails.ens) ||
                primaryMicrositeDetails?.ensData?.name}
            </p>
          </div>
        </div>
        <div className="flex-1 w-full">
          <textarea
            name="user-feed"
            id="user-feed"
            rows={4}
            className={`bg-gray-100 rounded-lg p-3 focus:outline-gray-200 w-full ${
              postContent.length > MAX_LENGTH
                ? "border-red-500 focus:outline-red-500"
                : "border-gray-300 focus:outline-gray-200"
            }`}
            placeholder="What’s happening?"
            value={postContent}
            onChange={handlePostChange}
          ></textarea>
          {error && (
            <p className="text-red-500 text-sm -translate-y-1">{error}</p>
          )}

          {/* Render media files */}
          {mediaFiles.length > 0 && (
            <div className="mt-4 w-full flex justify-center">
              {mediaFiles.length === 1 && (
                <div className="relative overflow-hidden rounded-2xl w-1/2">
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

              {/* Display for 2 media items */}
              {mediaFiles.length === 2 && (
                <div className="w-full grid grid-cols-2 gap-1 overflow-hidden h-[9rem]">
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

              {/* Display for 3 media items */}
              {mediaFiles.length === 3 && (
                <div className="w-full grid grid-cols-3 gap-1 overflow-hidden relative h-[8rem]">
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

              {/* Display for 4 media items */}
              {mediaFiles.length === 4 && (
                <div className="grid w-full grid-cols-2 gap-1 overflow-hidden h-[18rem]">
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

          <div className="flex items-center gap-10 justify-between mt-2">
            <div className="flex items-center gap-3">
              <ImageContent
                setFileError={setFileError}
                setMediaFiles={setMediaFiles}
                mediaFilesLength={mediaFiles.length}
              />
              <GifPickerContent
                mediaFilesLength={mediaFiles.length}
                setMediaFiles={setMediaFiles}
                setFileError={setFileError}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
              >
                <GrEmoji size={22} className="text-gray-800" />
              </button>
              <button className="cursor-not-allowed">
                <MdOutlineDateRange size={22} className="text-gray-400" />
              </button>
              <button className="cursor-not-allowed">
                <MdOutlineLocationOn size={24} className="text-gray-400" />
              </button>
            </div>
            <DynamicPrimaryBtn
              enableGradient={false}
              disabled={
                postLoading ||
                (postContent === "" && mediaFiles.length === 0) ||
                (error as any)
              }
              className={`!rounded w-28 !py-1.5 ${
                postContent === "" &&
                mediaFiles.length === 0 &&
                "bg-gray-500 brightness-75"
              } ${(postLoading || error) && "bg-gray-500"}`}
              onClick={handleFeedPosting}
            >
              <div>
                {postLoading ? (
                  <span className="flex items-center gap-1">
                    Posting <Spinner size="sm" color="default" />
                  </span>
                ) : (
                  "Post"
                )}
              </div>
            </DynamicPrimaryBtn>
          </div>

          {/* Emoji Picker - Renders below the buttons */}
          {showEmojiPicker && (
            <div className="mt-4">
              <Emoji
                onEmojiSelect={handleEmojiSelect}
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostFeed;
