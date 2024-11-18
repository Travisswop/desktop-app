"use client";
import Image from "next/image";
import React, { useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import AnimateButton from "@/components/Button/AnimateButton";
import imagePlaceholder from "@/public/images/image_placeholder.png";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import CustomFileInput from "@/components/CustomFileInput";
import { sendCloudinaryImage } from "@/util/SendCloudineryImage";
import { postBlog } from "@/actions/blog";
import { FaTimes } from "react-icons/fa";

const AddBlog = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state);
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputError, setInputError] = useState<any>({});
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>("");

  // console.log("file error", fileError);

  // const handleFileChange = (event: any) => {
  //   const file = event.target.files[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onloadend = () => {
  //       setImageFile(reader.result as any);
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // };

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // Check if file size is greater than 10 MB
        setFileError("File size should be less than 10 MB");
        setImageFile(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageFile(reader.result as any);
          setFileError("");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // console.log("imagefile", imageFile);

  const handleFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!imageFile) {
      setIsLoading(false);
      return setInputError({ ...inputError, image: "image is required" });
    }

    const imageUrl = await sendCloudinaryImage(imageFile);

    // console.log("image url submit", imageUrl);

    const info = {
      micrositeId: state.data._id,
      title: formData.get("title"),
      headline: formData.get("headline"),
      description: value,
      image: imageUrl,
    };

    // console.log("info", info);

    let errors = {};

    if (!info.title) {
      errors = { ...errors, title: "title is required" };
    }
    if (!info.headline) {
      errors = { ...errors, headline: "headline is required" };
    }
    if (!info.description) {
      errors = { ...errors, description: "description is required" };
    }
    if (!info.image) {
      errors = { ...errors, image: "image is required" };
    }

    if (Object.keys(errors).length > 0) {
      setInputError(errors);
      setIsLoading(false);
    } else {
      setInputError("");
      //   console.log("contactCardInfo", contactCardInfo);

      try {
        const data = await postBlog(info, sesstionState.accessToken);
        if ((data.state = "success")) {
          toast.success("blog created successfully");
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
        <h1 className="font-semibold text-gray-700">Blog</h1>
        <button type="button" onClick={() => handleRemoveIcon("Blog")}>
          <FaTimes size={20} />
        </button>
      </div>
      <div className="flex justify-between gap-10">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-2">
              <p className="font-semibold text-gray-700 text-sm">
                Select Photo
                <span className="text-red-600 font-medium text-sm mt-1">*</span>
              </p>
              <CustomFileInput handleFileChange={handleFileChange} />
            </div>
            <div className="2xl:hidden">
              <div className="border-2 border-[#d8acff] min-w-48 max-w-56 h-auto p-1 bg-slate-100 rounded-lg">
                {imageFile ? (
                  <Image
                    src={imageFile}
                    alt="blog photo"
                    width={200}
                    height={200}
                    className="w-full max-h-full rounded-md"
                  />
                ) : (
                  <Image
                    src={imagePlaceholder}
                    alt="blog photo"
                    width={200}
                    height={200}
                    className="w-full h-full rounded-md"
                  />
                )}
              </div>
              {inputError.image && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  Image is required
                </p>
              )}

              {fileError && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  {fileError}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">
              Blog Name
              <span className="text-red-600 font-medium text-sm mt-1">*</span>
            </p>
            <div>
              <input
                type="text"
                name="title"
                className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
                placeholder={"Enter blog name"}
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
            <p className="font-medium text-sm">
              Headline Text
              <span className="text-red-600 font-medium text-sm mt-1">*</span>
            </p>
            <input
              type="text"
              name="headline"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
              placeholder={"Enter Headline"}
              //   required
            />
            {inputError.headline && (
              <p className="text-red-600 font-medium text-sm">
                headline is required
              </p>
            )}
          </div>
        </div>
        <div className="gap-2 hidden 2xl:flex justify-end">
          <p className="font-semibold text-gray-700 text-sm">Photo </p>
          <div className="border-2 border-[#d8acff] min-w-56 max-w-64 min-h-32 max-h-36 p-1 bg-slate-100 rounded-lg">
            {imageFile ? (
              <div className="relative h-full">
                <Image
                  src={imageFile}
                  alt="blog photo"
                  width={200}
                  height={200}
                  className="w-full max-h-full rounded-md object-cover"
                />
              </div>
            ) : (
              <Image
                src={imagePlaceholder}
                alt="blog photo"
                width={200}
                height={200}
                className="w-full h-full rounded-md"
              />
            )}
            {inputError.image && (
              <p className="text-red-600 font-medium text-sm mt-2">
                Image is required
              </p>
            )}
            {fileError && (
              <p className="text-red-600 font-medium text-sm mt-2">
                {fileError}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="blog flex flex-col gap-1">
        <p className="font-medium text-sm">
          Description
          <span className="text-red-600 font-medium text-sm mt-1">*</span>
        </p>
        <ReactQuill
          placeholder="Enter Description"
          theme="snow"
          value={value}
          onChange={setValue}
        />
        {inputError.description && (
          <p className="text-red-600 font-medium text-sm">
            description is required
          </p>
        )}
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

export default AddBlog;
