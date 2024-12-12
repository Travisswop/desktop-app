"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import imagePlaceholder from "@/public/images/image_placeholder.png";
import CustomFileInput from "@/components/CustomFileInput";
import { postBlog } from "@/actions/blog";
import { FaTimes } from "react-icons/fa";
import { sendCloudinaryImage } from "@/lib/SendCloudineryImage";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { Editor } from "@tinymce/tinymce-react";
import toast from "react-hot-toast";
import { Tooltip } from "@nextui-org/react";
import { MdInfoOutline } from "react-icons/md";
import Cookies from "js-cookie";

const AddBlog = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state);
  //const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get("access-token");
      if (token) {
        setAccessToken(token);
      }
    };
    getAccessToken();
  }, []);
  const [value, setValue] = useState("");
  // const [editorState, setEditorState] = React.useState(() =>
  //   EditorState.createEmpty()
  // );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputError, setInputError] = useState<any>({});
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>("");

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
        const data = await postBlog(info, accessToken);
        if ((data.state = "success")) {
          toast.success("Blog created successfully");
          handleRemoveIcon("Blog");
        } else {
          toast.error("Something went wrong");
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
      className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4"
    >
      <div className="flex items-end gap-1 justify-center">
        <div className="flex items-end gap-1 justify-center">
          <h2 className="font-semibold text-gray-700 text-xl text-center">
            Blog
          </h2>
          <div className="translate-y-0.5">
            <Tooltip
              size="sm"
              content={
                <span className="font-medium">
                  Write a blog and host it right on your swop smart site.
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
          onClick={() => handleRemoveIcon("Blog")}
        >
          <FaTimes size={18} />
        </button>
      </div>
      <div className="flex justify-between gap-10">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex flex-col gap-2">
            {/* <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-2">
              <p className="font-semibold text-gray-700 text-sm">
                Select Photo
                <span className="text-red-600 font-medium text-sm mt-1">*</span>
              </p>
              <CustomFileInput handleFileChange={handleFileChange} />
            </div> */}
            <div className="">
              <div className="relative border-2 border-[#d8acff] w-full max-h-96 min-h-[22rem] p-1 bg-slate-100 rounded-lg">
                {imageFile ? (
                  <Image
                    src={imageFile}
                    alt="blog photo"
                    fill
                    className="w-full h-auto rounded-md object-cover"
                  />
                ) : (
                  <Image
                    src={imagePlaceholder}
                    alt="blog photo"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="rounded-md object-cover"
                  />
                )}
                <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2">
                  <CustomFileInput handleFileChange={handleFileChange} />
                </div>
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
              Headline
              <span className="text-red-600 font-medium text-sm mt-1">*</span>
            </p>
            <div>
              <input
                type="text"
                name="title"
                className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
                placeholder={"Enter Headline"}
                // required
              />
              {inputError.title && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  headline is required
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">
              Subtext
              <span className="text-red-600 font-medium text-sm mt-1">*</span>
            </p>
            <input
              type="text"
              name="headline"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
              placeholder={"Enter Subtext"}
              //   required
            />
            {inputError.headline && (
              <p className="text-red-600 font-medium text-sm">
                Subtext is required
              </p>
            )}
          </div>
        </div>
        {/* <div className="gap-2 hidden 2xl:flex justify-end">
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
        </div> */}
      </div>
      <div className="blog flex flex-col gap-1">
        <p className="font-medium text-sm">
          Description
          <span className="text-red-600 font-medium text-sm mt-1">*</span>
        </p>
        <Editor
          apiKey="njethe5lk1z21je67jjdi9v3wimfducwhl6jnnuip46yxwxh"
          value={value} // Bind the state to the editor
          onEditorChange={(content) => setValue(content)} // Update state on change
          init={{
            height: 300,
            plugins: [
              "autolink",
              "lists",
              "link",
              // "image",
              "charmap",
              "preview",
              "anchor",
              "searchreplace",
              "visualblocks",
              "code",
              "fullscreen",
              "insertdatetime",
              // "media",
              "table",
              "help",
            ],
            toolbar:
              "undo redo | bold italic underline | link image | alignleft aligncenter alignright alignjustify | bullist numlist | code",
          }}
        />
        {inputError.description && (
          <p className="text-red-600 font-medium text-sm">
            description is required
          </p>
        )}
      </div>
      <div className="flex justify-center">
        <AnimateButton
          whiteLoading={true}
          className="bg-black text-white py-2 !border-0"
          isLoading={isLoading}
          width={"w-40"}
        >
          <LiaFileMedicalSolid size={20} />
          Create
        </AnimateButton>
      </div>
    </form>
  );
};

export default AddBlog;
