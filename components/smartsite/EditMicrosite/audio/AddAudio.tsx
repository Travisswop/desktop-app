import Image from "next/image";
import React, { useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import AnimateButton from "@/components/Button/AnimateButton";
import "react-quill/dist/quill.snow.css";
import CustomFileInput from "@/components/CustomFileInput";
import imagePlaceholder from "@/public/images/image_placeholder.png";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import { sendCloudinaryImage } from "@/util/SendCloudineryImage";
import { postAudio } from "@/actions/audio";
import { sendCloudinaryAudio } from "@/util/sendCloudineryAudio";
import { FaTimes } from "react-icons/fa";

const AddAudio = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state);
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputError, setInputError] = useState<any>({});
  const [audioFile, setAudioFile] = useState<any>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>("");
  const [imageFileError, setImageFileError] = useState<string>("");

  const handleFileChange = (event: any) => {
    // get audio file
    const file = event.target.files[0];
    if (file && file.type.startsWith("audio/")) {
      if (file.size > 10 * 1024 * 1024) {
        // Check if file size is greater than 10 MB
        setFileError("File size should be less than 20 MB");
        setAudioFile(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioFile(reader.result as any);
          setFileError("");
        };
        reader.readAsDataURL(file);
      }
    } else {
      setFileError("Please upload a audio video file.");
    }
  };

  const handleImageFileChange = (event: any) => {
    // get image file
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 10 * 1024 * 1024) {
        // Check if file size is greater than 10 MB
        setImageFileError("File size should be less than 10 MB");
        setImageFile(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageFile(reader.result as any);
          setImageFileError("");
        };
        reader.readAsDataURL(file);
      }
    } else {
      setImageFileError("Please upload a image file.");
    }
  };

  //   console.log("audioFile", audioFile);

  const handleFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const info = {
      micrositeId: state.data._id,
      name: formData.get("name"),
      file: audioFile,
      coverPhoto: imageFile,
    };

    let errors = {};

    if (!info.name) {
      errors = { ...errors, title: "display name is required" };
    }
    if (!info.file) {
      errors = { ...errors, image: "audio is required" };
    }
    if (!info.coverPhoto) {
      errors = { ...errors, image: "cover photo is required" };
    }

    if (Object.keys(errors).length > 0) {
      setInputError(errors);
      setIsLoading(false);
    } else {
      setInputError("");
      try {
        const audioUrl = await sendCloudinaryAudio(info.file);
        if (!audioUrl) {
          toast.error("audio upload failed!");
        }
        info.file = audioUrl;

        const imageUrl = await sendCloudinaryImage(info.coverPhoto);
        if (!imageUrl) {
          return toast.error("cover photo upload failed!");
        }
        info.coverPhoto = imageUrl;

        // console.log("videee", info);

        if (imageUrl) {
          // console.log("post hocche");

          const data = await postAudio(info, sesstionState.accessToken);
          // console.log("data", data);

          if ((data.state = "success")) {
            toast.success("music created successfully");
          } else {
            toast.error("something went wrong");
          }
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
        <h1 className="font-semibold text-gray-700">Audio</h1>
        <button type="button" onClick={() => handleRemoveIcon("Music File")}>
          <FaTimes size={20} />
        </button>
      </div>

      <div className="flex justify-between gap-10">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-gray-700 text-sm">
              Select Audio
              <span className="text-red-600 font-medium text-sm mt-1">*</span>
            </p>
            <div className="">
              <div className="border-2 border-[#d8acff] min-w-72 max-w-[30rem] h-auto p-1 bg-slate-100 rounded-lg">
                {audioFile ? (
                  <AudioPlayer
                    autoPlay
                    src={audioFile}
                    className="h-full"
                    //   onPlay={(e) => console.log("onPlay")}
                    // other props here
                  />
                ) : (
                  <div>
                    <AudioPlayer autoPlay src="" className="h-full" />
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
              Display Name
              <span className="text-red-600 font-medium text-sm mt-1">*</span>
            </p>
            <div>
              <input
                type="text"
                name="name"
                className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
                placeholder={"Enter display name"}
                // required
              />
              {inputError.title && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  display name is required
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-gray-700 text-sm">
              Select Cover Photo
              <span className="text-red-600 font-medium text-sm mt-1">*</span>
            </p>
            <div className="">
              <div className="border-2 border-[#d8acff] w-max h-auto p-1 bg-slate-100 rounded-lg">
                {imageFile ? (
                  <Image
                    src={imageFile}
                    alt="cover photo"
                    width={200}
                    height={200}
                    className="w-32 h-24 rounded-md"
                  />
                ) : (
                  <Image
                    src={imagePlaceholder}
                    alt="cover photo"
                    width={200}
                    height={200}
                    className="w-32 h-24 rounded-md"
                  />
                )}
              </div>
              {inputError.image && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  cover photo is required
                </p>
              )}

              {imageFileError && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  {imageFileError}
                </p>
              )}
              <div className="mt-2">
                <CustomFileInput handleFileChange={handleImageFileChange} />
              </div>
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

export default AddAudio;
