"use client";
import React, { useEffect, useState } from "react";
import { MdOutlineLocationOn } from "react-icons/md";
import Emoji from "./Emoji";
import GifPickerContent from "./GifPicker";
import Image from "next/image";
import ImageContent from "./ImageSelect";
import { AiOutlineClose } from "react-icons/ai"; // Icon for close button
import { postFeed } from "@/actions/postFeed";
import { useUser } from "@/lib/UserContext";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import { sendCloudinaryVideo } from "@/lib/sendCloudinaryVideo";
import UserImageAvatar from "../util/Avatar";
import isUrl from "@/lib/isUrl";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useModalStore } from "@/zustandStore/modalstore";
import { GrEmoji } from "react-icons/gr";
import { HiOutlineGif } from "react-icons/hi2";
import { motion } from "framer-motion";
import { PiChartBarHorizontalBold } from "react-icons/pi";
import CreatePoll from "./CreatePoll";
import CustomModal from "../modal/CustomModal";
import { PrimaryButton } from "../ui/Button/PrimaryButton";
import { Loader } from "lucide-react";
import feedNft from "@/public/images/feed_nft.png";
import feedAI from "@/public/images/feed_AI.png";
import getSingleSmartsiteData from "@/actions/singleSmartsiteDataFetching";
import { formatEns } from "@/lib/formatEnsName";
import { CharacterCounter } from "./view/CharacterCountCircle";

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

  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [showMintModal, setShowMintModal] = useState(false);

  const [mintDataLoading, setMintDataLoading] = useState(false);
  const [mintData, setMintData] = useState([]);
  const [selectedMintForPost, setSelectedMintForPost] = useState<any>(null);

  // console.log("selectedMintForPost", selectedMintForPost);

  console.log("userbb", user);

  const [primaryMicrositeDetails, setPrimaryMicrositeDetails] =
    useState<any>(null);

  // console.log("primaryMicrositeDetails", primaryMicrositeDetails);

  const [postContent, setPostContent] = useState<string>("");
  const [fileError, setFileError] = useState<string>("");
  const [mediaFiles, setMediaFiles] = useState<
    { type: "image" | "video" | "gif"; src: string }[]
  >([]);
  const [error, setError] = useState("");

  const [isCreatePollModalOpen, setIsCreatePollModalOpen] = useState(false);

  // console.log("isCreatePollModalOpen", isCreatePollModalOpen);

  // Callback function to handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setPostContent((prevContent) => prevContent + emoji);
  };

  useEffect(() => {
    const getMintData = async () => {
      setMintDataLoading(true);
      const data = await getSingleSmartsiteData(user?.primaryMicrosite, token);
      setMintData(data.data.info.marketPlace || []);
      setMintDataLoading(false);
    };
    getMintData();
  }, [user?.primaryMicrosite, token]);

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

  const handleMintFeedPosting = async () => {
    try {
      setPostLoading(true);
      // setIsPostLoading(true);

      const payload = {
        smartsiteId: primaryMicrosite,
        userId: userId,
        postType: "minting",
        content: {
          // walletEnsName: ens,
          title: selectedMintForPost?.itemName,
          type: "product",
          image: selectedMintForPost?.itemImageUrl,
          price: selectedMintForPost.itemPrice,
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

  const MAX_LENGTH = 2000;

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
              {formatEns(
                (primaryMicrositeDetails && primaryMicrositeDetails.ens) ||
                  primaryMicrositeDetails?.ensData?.name
              )}
            </p>
          </div>
        </div>
        <div className="flex-1 w-full">
          <textarea
            name="user-feed"
            id="user-feed"
            rows={4}
            className={`bg-gray-100 rounded-lg p-3 focus:outline-gray-100 w-full ${
              postContent.length > MAX_LENGTH
                ? "border-none focus:outline-red-500"
                : "border-none focus:outline-gray-100"
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
                  setShowEmojiPicker(false); // Close emoji picker when opening gif
                }
              }}
              className={`${
                mediaFiles.length > 3 && "cursor-not-allowed disabled"
              }`}
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
                setIsCreatePollModalOpen(true);
              }}
            >
              <PiChartBarHorizontalBold size={22} className="text-gray-800" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiPicker(!showEmojiPicker);
                setShowGifPicker(false); // Close gif picker when opening emoji
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
                setShowMintModal(true);
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
          <div className="w-full flex justify-center mt-5">
            <PrimaryButton
              className="w-[90%] py-2"
              disabled={
                postLoading ||
                (postContent === "" && mediaFiles.length === 0) ||
                (error as any)
              }
              onClick={handleFeedPosting}
            >
              {postLoading ? (
                <Loader className="animate-spin" size={26} />
              ) : (
                "Post"
              )}
            </PrimaryButton>
          </div>
          {/* Emoji Picker - Renders below the buttons */}
          {/* Emoji / GIF Pickers with layout animation */}
          <motion.div layout transition={{ duration: 0.28, ease: "easeInOut" }}>
            {showEmojiPicker && (
              <div className="mt-4">
                <Emoji
                  onEmojiSelect={handleEmojiSelect}
                  showEmojiPicker={showEmojiPicker}
                  setShowEmojiPicker={setShowEmojiPicker}
                />
              </div>
            )}

            {showGifPicker && (
              <div className="mt-4">
                <GifPickerContent
                  mediaFilesLength={mediaFiles.length}
                  setMediaFiles={setMediaFiles}
                  setFileError={setFileError}
                  showGifPicker={showGifPicker}
                  setShowGifPicker={setShowGifPicker}
                />
              </div>
            )}
          </motion.div>

          {isCreatePollModalOpen && (
            <CustomModal
              isOpen={isCreatePollModalOpen}
              onCloseModal={setIsCreatePollModalOpen}
              title="Create Poll"
            >
              <CreatePoll setIsCreatePollModalOpen={setIsCreatePollModalOpen} />
            </CustomModal>
          )}
          {showMintModal && (
            <CustomModal
              isOpen={showMintModal}
              onCloseModal={setShowMintModal}
              title="Mint as NFT"
            >
              <div className="p-4">
                {mintDataLoading ? (
                  <p className="py-20 flex items-center gap-2 justify-center">
                    Loading data <Loader className="animate-spin" size={26} />
                  </p>
                ) : (
                  <div className="space-y-3 mb-6">
                    {mintData.length === 0 ? (
                      <p className="py-20 text-center">No Mint Available!</p>
                    ) : (
                      <>
                        {mintData.map((data: any, index) => (
                          <div
                            key={index}
                            onClick={() => setSelectedMintForPost(data)}
                            className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer"
                          >
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Image
                                src={data.itemImageUrl}
                                alt="mint image"
                                width={320}
                                height={320}
                              />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {data.itemName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {data.itemPrice}
                              </p>
                            </div>
                            {data?._id === selectedMintForPost?._id && (
                              <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                <PrimaryButton
                  className="w-full py-3"
                  disabled={!selectedMintForPost || postLoading}
                  onClick={handleMintFeedPosting}
                >
                  Create{" "}
                  {postLoading && <Loader className="animate-spin" size={26} />}
                </PrimaryButton>
              </div>
            </CustomModal>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostFeed;
