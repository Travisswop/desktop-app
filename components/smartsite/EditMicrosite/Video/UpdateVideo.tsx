import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Switch,
} from "@nextui-org/react";
import { AiOutlineDownCircle } from "react-icons/ai";
import { IoLinkOutline } from "react-icons/io5";
import { LiaFileMedicalSolid } from "react-icons/lia";
import { embedItems, icon } from "@/util/data/smartsiteIconData";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import { FaTimes } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import AnimateButton from "@/components/Button/AnimateButton";
import { deleteEmbedLink, updateEmbedLink } from "@/actions/embedLink";
import { sendCloudinaryVideo } from "@/util/sendCloudineryVideo";
import { deleteVideo, postVideo, updateVideo } from "@/actions/video";
import placeholder from "@/public/images/video_player_placeholder.gif";
import CustomFileInput from "@/components/CustomFileInput";

const UpdateVideo = ({ iconDataObj, isOn, setOff }: any) => {
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);
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
  // console.log("icon data obj", iconDataObj);

  const handleFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const info = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
      title: formData.get("title"),
      file: videoFile || iconDataObj.data.link,
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
        if (videoFile) {
          const videoUrl = await sendCloudinaryVideo(info.file);
          if (!videoUrl) {
            toast.error("image upload failed!");
          }
          info.file = videoUrl;
        }

        const data = await updateVideo(info, sesstionState.accessToken);
        // console.log("data", data);

        if ((data.state = "success")) {
          setOff();
          toast.success("video updated successfully");
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

  // Function to close the modal
  const closeModal = () => {
    setOff();
  };
  // Function to handle click on the backdrop
  const handleBackdropClick = (e: any) => {
    if (
      e.target.classList.contains("backdrop") &&
      !e.target.closest(".modal-content")
    ) {
      closeModal();
    }
  };

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    const submitData = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
    };
    try {
      const data: any = await deleteVideo(
        submitData,
        sesstionState.accessToken
      );
      // console.log("data,", data);

      if (data && data?.state === "success") {
        setOff();
        toast.success("video deleted successfully");
        setOff();
      } else {
        toast.error("something went wrong");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  return (
    <>
      {isOn && (
        <div
          className="fixed z-50 left-0 top-0 h-full w-full overflow-auto flex items-center justify-center bg-overlay/50 backdrop"
          onMouseDown={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className="modal-content h-max w-96 lg:w-[40rem] bg-white relative rounded-xl"
          >
            <button
              className="btn btn-sm btn-circle absolute right-4 top-[12px]"
              onClick={closeModal}
            >
              <FaTimes color="gray" />
            </button>
            <div className="bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
              <form
                onSubmit={handleFormSubmit}
                className="bg-white flex flex-col gap-4"
              >
                <h1 className="font-semibold text-gray-700">Video</h1>
                <div className="flex justify-between gap-10">
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-gray-700 text-sm">
                        Select Video
                        <span className="text-red-600 font-medium text-sm mt-1">
                          *
                        </span>
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
                              <source
                                src={videoFile as string}
                                type="video/mp4"
                              />
                              <track
                                src="/path/to/captions.vtt"
                                kind="subtitles"
                                srcLang="en"
                                label="English"
                              />
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <div>
                              <video
                                key={iconDataObj.data.link as string}
                                width="420"
                                height="320"
                                controls
                              >
                                <source
                                  src={iconDataObj.data.link as string}
                                  type="video/mp4"
                                />
                                <track
                                  src="/path/to/captions.vtt"
                                  kind="subtitles"
                                  srcLang="en"
                                  label="English"
                                />
                                Your browser does not support the video tag.
                              </video>
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
                          <CustomFileInput
                            handleFileChange={handleFileChange}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">
                        Title
                        <span className="text-red-600 font-medium text-sm mt-1">
                          *
                        </span>
                      </p>
                      <div>
                        <input
                          type="text"
                          name="title"
                          defaultValue={iconDataObj.data.title}
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
                <div className="flex justify-between mt-3">
                  <AnimateButton isLoading={isLoading} width={"w-52"}>
                    <LiaFileMedicalSolid size={20} />
                    Save Changes
                  </AnimateButton>
                  <AnimateButton
                    type="button"
                    onClick={handleDelete}
                    isLoading={isDeleteLoading}
                    width={"w-28"}
                  >
                    <MdDelete size={20} /> Delete
                  </AnimateButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateVideo;
