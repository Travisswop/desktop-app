import Image from "next/image";
import { filterVideoFilesByPlan } from "@/lib/videoLimits";
import React, { useRef, useState } from "react";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
// import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
// import { toast } from "react-toastify";
// import AnimateButton from "@/components/Button/AnimateButton";
import placeholder from "@/public/images/video_player_placeholder.gif";
// import "react-quill/dist/quill.snow.css";
// import CustomFileInput from "@/components/CustomFileInput";
import { postVideo } from "@/actions/video";
// import { sendCloudinaryVideo } from "@/util/sendCloudinaryVideo";
import { sendCloudinaryVideo } from "@/lib/sendCloudinaryVideo";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import CustomFileInput from "@/components/CustomFileInput";
import toast from "react-hot-toast";
import { MdInfoOutline } from "react-icons/md";
import { Tooltip } from "@nextui-org/react";
import filePlaceholder from "@/public/images/placeholder-photo.png";
import Cookies from "js-cookie";
import { useEffect } from "react";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { Loader } from "lucide-react";
import { isSmartSiteMutationSuccess } from "../smartsiteMutationResult";

const AddVideo = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state);
  const [token, setToken] = useState("");

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get("access-token");
      setToken(token || "");
    };
    getAccessToken();
  }, []);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputError, setInputError] = useState<any>({});
  const [videoFile, setVideoFile] = useState<any>(null);
  const [videoFileType, setVideoFileType] = useState<"image" | "video" | null>(
    null,
  );
  const [fileError, setFileError] = useState<string>("");
  const isSubmittingRef = useRef(false);

  const [attachLink, setAttachLink] = useState<string>("");

  const handleFileChange = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    const nextFileType = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : null;

    if (!nextFileType) {
      setFileError("Please upload a valid image or video file.");
      setVideoFile(null);
      setVideoFileType(null);
      return;
    }

    const maxSize = nextFileType === "video" ? 20 : 10;
    if (file.size > maxSize * 1024 * 1024) {
      setFileError(`File size should be less than ${maxSize} MB`);
      setVideoFile(null);
      setVideoFileType(null);
      return;
    }

    if (nextFileType === "video") {
      // Plan-based video length cap (2 min free / 30 min premium).
      const [allowed] = await filterVideoFilesByPlan([file]);
      if (!allowed) {
        setVideoFile(null);
        setVideoFileType(null);
        return;
      }
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoFile(reader.result as any);
      setVideoFileType(nextFileType);
      setFileError("");
    };
    reader.readAsDataURL(file);
  };

  // console.log("videoFile", videoFile);

  const handleFormSubmit = async (e: any) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    const info = {
      micrositeId: state._id,
      title: formData.get("title"),
      file: videoFile,
      attachLink: attachLink,
    };

    let errors = {};

    if (!info.title) {
      errors = { ...errors, title: "title is required" };
    }
    if (!info.file && !attachLink) {
      errors = { ...errors, image: "media is required" };
    }

    if (Object.keys(errors).length > 0) {
      setInputError(errors);
      isSubmittingRef.current = false;
      setIsLoading(false);
    } else {
      setInputError("");
      try {
        if (info?.file) {
          const uploadedUrl =
            videoFileType === "image"
              ? await sendCloudinaryImage(info.file)
              : await sendCloudinaryVideo(info.file);
          if (!uploadedUrl) {
            toast.error("Media upload failed!");
            throw new Error("Media upload failed");
          }
          info.file = uploadedUrl;
        } else {
          info.file = attachLink;
        }
        const data = await postVideo(info, token);
        // console.log("data", data);

        if (isSmartSiteMutationSuccess(data)) {
          toast.success("Video created successfully");
          handleRemoveIcon("Video");
        } else {
          toast.error("Something went wrong!");
        }
      } catch (error) {
        console.error(error);
      } finally {
        isSubmittingRef.current = false;
        setIsLoading(false);
      }
    }
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="relative flex flex-col gap-4 sm:px-10 2xl:px-[10%]"
    >
      <div className="flex items-end gap-1 justify-center">
        <div className="flex items-end gap-1 justify-center">
          <h2 className="font-semibold text-gray-700 text-xl text-center">
            Photo/Video
          </h2>
          <div className="translate-y-0.5">
            <Tooltip
              size="sm"
              content={
                <span className="font-medium">
                  You can add a photo or video by uploading it directly or
                  sharing an external link, along with providing a title.
                </span>
              }
              className={`max-w-40 h-auto`}
            >
              <button>
                <MdInfoOutline />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-10">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex flex-col gap-1">
            <div className="">
              <div className="relative border-2 border-[#d8acff] w-full h-80 p-1 bg-slate-100 rounded-lg">
                {videoFile ? (
                  videoFileType === "image" ? (
                    <Image
                      src={videoFile as string}
                      alt="Selected media"
                      fill
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <video
                      key={videoFile as string}
                      className="w-full h-full object-cover rounded-lg"
                      controls
                    >
                      <source src={videoFile as string} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  )
                ) : (
                  <div className="relative w-full h-full">
                    <Image
                      src={placeholder}
                      alt="blog photo"
                      fill
                      className="w-full h-full rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
              {inputError.image && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  Photo or video is required
                </p>
              )}

              {fileError && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  {fileError}
                </p>
              )}
              <div className="mt-2">
                <p className="font-medium text-sm mb-1">
                  Add Your Photo or Video
                  <span className="text-red-600 font-medium text-sm mt-1">
                    *
                  </span>
                </p>
                <div className="w-full bg-white shadow-medium rounded-xl px-20 py-10">
                  <div className="bg-gray-100 rounded-xl p-4 flex flex-col items-center gap-2">
                    <Image
                      src={filePlaceholder}
                      alt="placeholder"
                      className="w-12"
                    />
                    <p className="text-gray-400 font-normal text-sm">
                      Select Photo/Video
                    </p>
                    <CustomFileInput
                      title={"Browse"}
                      handleFileChange={handleFileChange}
                      accept="image/*,video/*"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium">
              Title
              <span className="text-red-600 font-medium text-sm mt-1">*</span>
            </p>
            <div>
              <input
                type="text"
                name="title"
                className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
                placeholder={"Enter media title"}
                // required
              />
              {inputError.title && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  title is required
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Attach Link</p>
            <div>
              <input
                type="url"
                name="link"
                className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
                placeholder={"Enter image or video URL"}
                onChange={(e) => setAttachLink(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      <PrimaryButton className="w-full py-3" disabled={isLoading}>
        {isLoading ? (
          <Loader className="w-8 h-8 animate-spin mx-auto" />
        ) : (
          "Save"
        )}
      </PrimaryButton>
    </form>
  );
};

export default AddVideo;
