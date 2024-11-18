import Image from "next/image";
import React, { ChangeEvent, useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import AnimateButton from "@/components/Button/AnimateButton";
import placeholder from "@/public/images/video_player_placeholder.gif";
import "react-quill/dist/quill.snow.css";
import CustomFileInput from "@/components/CustomFileInput";
import { postVideo } from "@/actions/video";
import { sendCloudinaryVideo } from "@/util/sendCloudineryVideo";
import { FaTimes } from "react-icons/fa";

const AddVideo = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state);
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputError, setInputError] = useState<any>({});
  const [videoFile, setVideoFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>("");

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
    };

    let errors = {};

    if (!info.title) {
      errors = { ...errors, title: "title is required" };
    }
    if (!info.file) {
      errors = { ...errors, image: "video is required" };
    }

    if (Object.keys(errors).length > 0) {
      setInputError(errors);
      setIsLoading(false);
    } else {
      setInputError("");
      try {
        const videoUrl = await sendCloudinaryVideo(info.file);
        if (!videoUrl) {
          toast.error("image upload failed!");
        }
        info.file = videoUrl;
        // console.log("videee", info);

        const data = await postVideo(info, sesstionState.accessToken);
        // console.log("data", data);

        if ((data.state = "success")) {
          toast.success("video created successfully");
        } else {
          toast.error("something went wrong");
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
      className="bg-white rounded-xl shadow-small p-6 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-gray-700">Video</h1>
        <button type="button" onClick={() => handleRemoveIcon("Video")}>
          <FaTimes size={20} />
        </button>
      </div>

      <div className="flex justify-between gap-10">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-gray-700 text-sm">
              Select Video
              <span className="text-red-600 font-medium text-sm mt-1">*</span>
            </p>
            <div className="">
              <div className="border-2 border-[#d8acff] min-w-72 max-w-96 h-auto p-1 bg-slate-100 rounded-lg">
                {videoFile ? (
                  <video
                    key={videoFile as string}
                    width="420"
                    height="320"
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
                  <div className="relative">
                    <Image
                      src={placeholder}
                      alt="blog photo"
                      width={400}
                      height={200}
                      className="w-full h-[220px] rounded-md object-cover"
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
                <CustomFileInput handleFileChange={handleFileChange} />
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
        </div>
      </div>
      <div className="flex justify-end mt-3">
        <AnimateButton isLoading={isLoading} width={"w-52"}>
          <LiaFileMedicalSolid size={20} />
          Save Changes
        </AnimateButton>
      </div>
    </form>
  );
};

export default AddVideo;
