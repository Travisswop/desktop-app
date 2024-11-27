import Image from "next/image";
import React, { useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
// import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
// import { toast } from "react-toastify";
// import AnimateButton from "@/components/Button/AnimateButton";
import placeholder from "@/public/images/video_player_placeholder.gif";
// import "react-quill/dist/quill.snow.css";
// import CustomFileInput from "@/components/CustomFileInput";
import { postVideo } from "@/actions/video";
// import { sendCloudinaryVideo } from "@/util/sendCloudineryVideo";
import { FaTimes } from "react-icons/fa";
import { sendCloudinaryVideo } from "@/lib/sendCloudineryVideo";
import CustomFileInput from "@/components/CustomFileInput";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import toast from "react-hot-toast";
import { MdInfoOutline } from "react-icons/md";
import { Tooltip } from "@nextui-org/react";
import filePlaceholder from "@/public/images/placeholder-photo.png";

const AddVideo = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state);
  //const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value
  const demoToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjM4NjMyMDIzMDQxMDMyODAyOTk4MmIiLCJpYXQiOjE3MjcxNTI4MzB9.CsHnZAgUzsfkc_g_CZZyQMXc02Ko_LhnQcCVpeCwroY";

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputError, setInputError] = useState<any>({});
  const [videoFile, setVideoFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>("");

  const [attachLink, setAttachLink] = useState<string>("");

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("video/")) {
      if (file.size > 20 * 1024 * 1024) {
        // Check if file size is greater than 10 MB
        setFileError("File size should be less than 20 MB");
        setVideoFile(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setVideoFile(reader.result as any);
          setFileError("");
        };
        reader.readAsDataURL(file);
      }
    } else {
      setFileError("Please upload a valid video file.");
    }
  };

  // console.log("videoFile", videoFile);

  const handleFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const info = {
      micrositeId: state.data._id,
      title: formData.get("title"),
      file: videoFile,
      attachLink: attachLink,
    };

    let errors = {};

    if (!info.title) {
      errors = { ...errors, title: "title is required" };
    }
    if (!info.file && !attachLink) {
      errors = { ...errors, image: "video is required" };
    }

    if (Object.keys(errors).length > 0) {
      setInputError(errors);
      setIsLoading(false);
    } else {
      setInputError("");
      try {
        if (info?.file) {
          const videoUrl = await sendCloudinaryVideo(info.file);
          if (!videoUrl) {
            toast.error("Image upload failed!");
          }
          info.file = videoUrl;
        } else {
          info.file = attachLink;
        }
        const data = await postVideo(info, demoToken);
        // console.log("data", data);

        if ((data.state = "success")) {
          toast.success("Video created successfully");
        } else {
          toast.error("Something went wrong!");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4 px-10 2xl:px-[10%]"
    >
      <div className="flex items-end gap-1 justify-center">
        <div className="flex items-end gap-1 justify-center">
          <h2 className="font-semibold text-gray-700 text-xl text-center">
            Video
          </h2>
          <div className="translate-y-0.5">
            <Tooltip
              size="sm"
              content={
                <span className="font-medium">
                  You can embed a video by either uploading it directly or
                  sharing an external link, along with providing a title for the
                  content.
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
        <button
          className="absolute top-3 right-3"
          type="button"
          onClick={() => handleRemoveIcon("Video")}
        >
          <FaTimes size={18} />
        </button>
      </div>

      <div className="flex justify-between gap-10">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex flex-col gap-1">
            <div className="">
              <div className="border-2 border-[#d8acff] w-full h-80 p-1 bg-slate-100 rounded-lg">
                {videoFile ? (
                  <video
                    key={videoFile as string}
                    className="w-full h-full object-cover rounded-lg"
                    controls
                  >
                    <source src={videoFile as string} type="video/mp4" />
                    <track
                      src="/path/to/captions.vtt"
                      kind="subtitles"
                      srcLang="en"
                      label="English"
                    />
                    Your browser does not support the video tag.
                  </video>
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
                  Video is required
                </p>
              )}

              {fileError && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  {fileError}
                </p>
              )}
              <div className="mt-2">
                <p className="font-semibold text-gray-700 text-sm mb-1">
                  Add Your Video
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
                      Select Video
                    </p>
                    <CustomFileInput
                      title={"Browse"}
                      handleFileChange={handleFileChange}
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
                placeholder={"Enter video title"}
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
                placeholder={"Enter video url"}
                onChange={(e) => setAttachLink(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <AnimateButton
          className="bg-black text-white py-2 !border-0"
          whiteLoading={true}
          isLoading={isLoading}
          width={"w-48"}
        >
          <LiaFileMedicalSolid size={20} />
          Create
        </AnimateButton>
      </div>
    </form>
  );
};

export default AddVideo;
