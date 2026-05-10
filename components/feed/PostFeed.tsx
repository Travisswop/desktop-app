"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { postFeed } from "@/actions/postFeed";
import { useUser } from "@/lib/UserContext";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import { sendCloudinaryVideo } from "@/lib/sendCloudinaryVideo";
import UserImageAvatar from "../util/Avatar";
import isUrl from "@/lib/isUrl";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useModalStore } from "@/zustandStore/modalstore";
import CreatePoll from "./CreatePoll";
import CustomModal from "../modal/CustomModal";
import { PrimaryButton } from "../ui/Button/PrimaryButton";
import { Loader } from "lucide-react";
import getSingleSmartsiteData from "@/actions/singleSmartsiteDataFetching";
import { formatEns } from "@/lib/formatEnsName";
import MediaPreview from "./MediaPreview";

// ── Caret position helper ────────────────────────────────────────────────────
// Mirrors the textarea's exact CSS into a hidden off-screen div, writes the
// text up to the caret, appends a zero-width span, and reads that span's
// offsetTop/offsetLeft relative to the textarea.
const MIRROR_STYLES: (keyof CSSStyleDeclaration)[] = [
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
  "whiteSpace",
  "wordBreak",
  "wordWrap",
];

function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  caretPos: number,
): { top: number; left: number } {
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.top = "-9999px";
  div.style.left = "-9999px";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.overflowWrap = "break-word";

  const computed = window.getComputedStyle(textarea);
  MIRROR_STYLES.forEach((prop) => {
    div.style[prop as any] = computed[prop as any];
  });

  const textBefore = textarea.value.substring(0, caretPos);
  div.textContent = textBefore;

  const span = document.createElement("span");
  span.textContent = textarea.value.substring(caretPos) || ".";
  div.appendChild(span);

  document.body.appendChild(div);

  const rect = textarea.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();

  // Offset of span relative to div, plus textarea scroll offset
  const top =
    span.offsetTop - textarea.scrollTop + parseFloat(computed.paddingTop);
  const left =
    span.offsetLeft - textarea.scrollLeft + parseFloat(computed.paddingLeft);

  document.body.removeChild(div);

  return { top, left };
}
// ────────────────────────────────────────────────────────────────────────────

const PostFeed = ({
  primaryMicrositeImg,
  userId,
  token,
}: {
  userId: string;
  primaryMicrositeImg: string;
  token: string;
}) => {
  const { user }: any = useUser();
  const router = useRouter();
  const { closeModal, triggerFeedRefetch } = useModalStore();
  const [postLoading, setPostLoading] = useState<boolean>(false);
  const [primaryMicrosite, setPrimaryMicrosite] = useState<string>("");

  const [showMintModal, setShowMintModal] = useState(false);
  const [mintDataLoading, setMintDataLoading] = useState(false);
  const [mintData, setMintData] = useState([]);
  const [selectedMintForPost, setSelectedMintForPost] = useState<any>(null);
  const [primaryMicrositeDetails, setPrimaryMicrositeDetails] =
    useState<any>(null);

  const [postContent, setPostContent] = useState<string>("");
  const [fileError, setFileError] = useState<string>("");
  const [mediaFiles, setMediaFiles] = useState<
    { type: "image" | "video" | "gif"; src: string }[]
  >([]);
  const [error, setError] = useState("");
  const [isCreatePollModalOpen, setIsCreatePollModalOpen] = useState(false);

  // ── @mention state ──────────────────────────────────────────────────────────
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pixel coords of the @ sign inside the textarea
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  // ────────────────────────────────────────────────────────────────────────────

  const handleEmojiSelect = (emoji: string) => {
    setPostContent((prev) => prev + emoji);
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
    if (fileError) toast.error(fileError);
  }, [fileError]);

  useEffect(() => {
    if (!user) return;
    setPrimaryMicrosite(user.primaryMicrosite);
    const primary = user.microsites?.find((m: any) => m?.primary);
    setPrimaryMicrositeDetails(primary);
  }, [user]);

  // ── @mention: detect trigger & record caret position ────────────────────
  const detectMention = (value: string, cursorPos: number) => {
    const textUpToCursor = value.slice(0, cursorPos);
    const match = textUpToCursor.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      // Find where the @ character sits so we can anchor the dropdown there
      if (textareaRef.current) {
        const atIndex = cursorPos - match[0].length; // position of '@'
        const coords = getCaretCoordinates(textareaRef.current, atIndex);
        const lineHeight =
          parseFloat(window.getComputedStyle(textareaRef.current).lineHeight) ||
          20;
        setMentionPos({ top: coords.top + lineHeight, left: coords.left });
      }
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  // ── @mention: fetch users ────────────────────────────────────────────────
  useEffect(() => {
    if (mentionQuery === null) return;

    if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);

    mentionDebounceRef.current = setTimeout(async () => {
      // API requires at least 2 characters
      if (mentionQuery.length < 2) {
        setMentionResults([]);
        return;
      }
      try {
        setMentionLoading(true);
        const queryParams = new URLSearchParams({ page: "1", limit: "8" });
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/search?q=${mentionQuery}&userId=${userId}&filter=following&${queryParams}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const json = await res.json();
        setMentionResults(json?.data?.results ?? []);
        setMentionIndex(0);
      } catch (err) {
        console.error("Mention search error:", err);
      } finally {
        setMentionLoading(false);
      }
    }, 250);
  }, [mentionQuery, userId, token]);

  // ── @mention: insert selected user's ENS ────────────────────────────────
  const insertMention = (selectedUser: any) => {
    const ens =
      selectedUser?.ens || selectedUser?.username || selectedUser?.name || "";

    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart ?? postContent.length;
    const before = postContent.slice(0, cursorPos);
    const after = postContent.slice(cursorPos);
    const replaced = before.replace(/@(\w*)$/, `@${ens} `);

    setPostContent(replaced + after);
    setMentionQuery(null);
    setMentionResults([]);

    setTimeout(() => {
      textarea.focus();
      const newPos = replaced.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // ── @mention: keyboard nav ───────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionResults.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % mentionResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex(
        (i) => (i - 1 + mentionResults.length) % mentionResults.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      insertMention(mentionResults[mentionIndex]);
    } else if (e.key === "Escape") {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !textareaRef.current?.contains(e.target as Node)
      ) {
        setMentionQuery(null);
        setMentionResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // ────────────────────────────────────────────────────────────────────────────

  const handleFeedPosting = async () => {
    try {
      setPostLoading(true);
      const updatedMediaFiles = await Promise.all(
        mediaFiles.map(async (file) => {
          if (file.type === "image") {
            const imageUrl = await sendCloudinaryImage(file.src);
            return { type: "image", src: imageUrl };
          } else if (file.type === "video") {
            const videoUrl = await sendCloudinaryVideo(file.src);
            return { type: "video", src: videoUrl };
          } else {
            return file;
          }
        }),
      );

      const payload = {
        smartsiteId: primaryMicrosite,
        userId: userId,
        postType: "post",
        content: {
          title: postContent,
          post_content: updatedMediaFiles,
        },
      };

      const data = await postFeed(payload, token);

      if (data?.state === "success") {
        toast.success("You posted successfully!");
        setMediaFiles([]);
        setPostContent("");
        router.push("/");
        triggerFeedRefetch();
        closeModal();
      }
      if (data?.state === "not-allowed") {
        toast.error("You not allowed to create feed post!");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setPostLoading(false);
    }
  };

  const handleMintFeedPosting = async () => {
    try {
      setPostLoading(true);
      const payload = {
        smartsiteId: primaryMicrosite,
        userId: userId,
        postType: "minting",
        content: {
          title: selectedMintForPost?.itemName,
          type: "product",
          image: selectedMintForPost?.itemImageUrl,
          price: selectedMintForPost.itemPrice,
        },
      };

      const data = await postFeed(payload, token);

      if (data?.state === "success") {
        toast.success("You posted successfully!");
        setMediaFiles([]);
        setPostContent("");
        router.push("/");
        triggerFeedRefetch();
        closeModal();
      }
      if (data?.state === "not-allowed") {
        toast.error("You not allowed to create feed post!");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setPostLoading(false);
    }
  };

  const MAX_LENGTH = 2000;

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length > MAX_LENGTH) {
      setError(`** Comment cannot exceed ${MAX_LENGTH} characters.`);
    } else {
      setError("");
    }
    setPostContent(value);
    detectMention(value, e.target.selectionStart ?? value.length);
  };

  return (
    <div className="p-6 pt-2 relative">
      {/* Loading overlay */}
      {postLoading && (
        <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3">
          <Loader className="animate-spin text-gray-700" size={32} />
          <p className="text-sm font-medium text-gray-600">
            Publishing your post...
          </p>
        </div>
      )}

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
                  primaryMicrositeDetails?.ensData?.name,
              )}
            </p>
          </div>
        </div>

        <div className="flex-1 w-full">
          {/* Textarea wrapper — position:relative so the dropdown is anchored here */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              name="user-feed"
              id="user-feed"
              rows={4}
              className={`bg-gray-100 rounded-lg p-3 focus:outline-gray-100 w-full resize-none ${
                postContent.length > MAX_LENGTH
                  ? "border-none focus:outline-red-500"
                  : "border-none focus:outline-gray-100"
              }`}
              placeholder="What's happening? Type @ to mention someone"
              value={postContent}
              onChange={handlePostChange}
              onKeyDown={handleKeyDown}
            />

            {/* @mention dropdown — positioned at the caret, not at the textarea bottom */}
            {(mentionLoading || mentionResults.length > 0) &&
              mentionQuery !== null && (
                <div
                  ref={dropdownRef}
                  style={{
                    position: "absolute",
                    top: mentionPos.top - 10,
                    left: mentionPos.left,
                    // Clamp so it never overflows the right edge of the textarea
                    maxWidth: `calc(100% - ${mentionPos.left}px)`,
                    minWidth: "240px",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                  className="bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-52 overflow-y-auto"
                >
                  {mentionLoading && mentionResults.length === 0 ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                      <Loader className="animate-spin" size={14} />
                      Searching...
                    </div>
                  ) : (
                    mentionResults.map((u: any, idx: number) => {
                      const displayEns = u?.ens || u?.username || "";
                      const displayName = u?.name || u?.username || displayEns;
                      const avatar = u?.profilePic || u?.image || null;

                      return (
                        <button
                          key={u?._id ?? idx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault(); // keep textarea focused
                            insertMention(u);
                          }}
                          onMouseEnter={() => setMentionIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            idx === mentionIndex
                              ? "bg-gray-100"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                            {avatar ? (
                              <Image
                                src={
                                  isUrl(avatar)
                                    ? avatar
                                    : `/images/user_avator/${avatar}.png`
                                }
                                alt={displayName}
                                width={32}
                                height={32}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-500 uppercase">
                                {displayName?.[0] ?? "?"}
                              </div>
                            )}
                          </div>

                          {/* Name + ENS */}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {displayName}
                            </p>
                            {displayEns && displayEns !== displayName && (
                              <p className="text-xs text-gray-400 truncate">
                                {formatEns(displayEns)}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
          </div>

          {error && (
            <p className="text-red-500 text-sm -translate-y-1">{error}</p>
          )}

          <MediaPreview
            mediaFiles={mediaFiles}
            setMediaFiles={setMediaFiles}
            setFileError={setFileError}
            postContent={postContent}
            onEmojiSelect={handleEmojiSelect}
            onOpenPoll={() => setIsCreatePollModalOpen(true)}
            onOpenMint={() => setShowMintModal(true)}
          />

          <div className="w-full flex justify-center mt-5">
            <PrimaryButton
              className="w-[90%] py-2"
              disabled={
                postLoading ||
                (postContent === "" && mediaFiles.length === 0) ||
                !!(error as any)
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
                      mintData.map((data: any, index) => {
                        const isSelected =
                          data?._id === selectedMintForPost?._id;
                        return (
                          <div
                            key={index}
                            onClick={() => setSelectedMintForPost(data)}
                            className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? "-translate-y-2 mx-1 bg-white shadow-lg border border-gray-200"
                                : "bg-gray-50 hover:bg-gray-100"
                            }`}
                          >
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                              <Image
                                src={data.itemImageUrl}
                                alt="mint image"
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {data.itemName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {data.itemPrice}
                              </p>
                            </div>
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                isSelected
                                  ? "bg-black scale-100 opacity-100"
                                  : "bg-gray-200 scale-75 opacity-0"
                              }`}
                            >
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        );
                      })
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
