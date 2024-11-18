import React, { useState, useRef, useEffect } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import { FaTimes } from "react-icons/fa";
import AnimateButton from "@/components/Button/AnimateButton";
import { handleDeleteAppIcon } from "@/actions/appIcon";
import {
  handleDeleteContactCard,
  updateContactCard,
} from "@/actions/contactCard";
import { MdDelete } from "react-icons/md";
import { sendCloudinaryImage } from "@/util/SendCloudineryImage";
import "react-quill/dist/quill.snow.css"; // Add this line if not already present
import ReactQuill from "react-quill";
import Image from "next/image";
import CustomFileInput from "@/components/CustomFileInput";
import { icon } from "@/util/data/smartsiteIconData";
import { deleteBlog, updateBlog } from "@/actions/blog";

const UpdateBlog = ({ iconDataObj, isOn, setOff }: any) => {
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputError, setInputError] = useState<any>({});
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>("");
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeModal = () => {
    setOff();
  };
  const handleBackdropClick = (e: any) => {
    if (
      e.target.classList.contains("backdrop") &&
      !e.target.closest(".modal-content")
    ) {
      closeModal();
    }
  };

  useEffect(() => {
    setValue(iconDataObj.data.description);
  }, [iconDataObj.data.description]);

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

  //   console.log("imagefile", imageFile);

  const handleFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const imageUrl = imageFile
      ? await sendCloudinaryImage(imageFile)
      : undefined;

    const info = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
      title: formData.get("title"),
      headline: formData.get("headline"),
      description: value,
      image: imageUrl || iconDataObj.data.image,
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
        const data = await updateBlog(info, sesstionState.accessToken);
        // console.log("data for update blog", data);

        if ((data.state = "success")) {
          setOff();
          toast.success("blog updated successfully");
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

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    const submitData = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
    };
    try {
      const data: any = await deleteBlog(submitData, sesstionState.accessToken);

      if (data && data?.state === "success") {
        setOff();
        toast.success("blog deleted successfully");
      } else {
        toast.error("Something went wrong");
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
            className="modal-content h-max w-96 md:w-[46rem] bg-white relative rounded-xl"
          >
            <button
              className="btn btn-sm btn-circle absolute right-4 top-[12px]"
              onClick={closeModal}
            >
              <FaTimes color="gray" />
            </button>
            <div className="bg-white rounded-xl shadow-small p-7 flex flex-col gap-4">
              <form
                onSubmit={handleFormSubmit}
                className="bg-white rounded-xl shadow-small p-6 flex flex-col gap-4"
              >
                <h1 className="font-semibold text-gray-700">Blog</h1>
                <div className="flex justify-between gap-4">
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-2">
                        <p className="font-semibold text-gray-700 text-sm">
                          Select Photo
                          <span className="text-red-600 font-medium text-sm mt-1">
                            *
                          </span>
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
                              className="w-full max-h-full rounded-md object-cover"
                            />
                          ) : (
                            <Image
                              src={iconDataObj.data.image}
                              alt="blog photo"
                              width={200}
                              height={200}
                              className="w-full max-h-full rounded-md object-cover"
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
                        <span className="text-red-600 font-medium text-sm mt-1">
                          *
                        </span>
                      </p>
                      <input
                        type="text"
                        name="headline"
                        defaultValue={iconDataObj.data.headline}
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
                    <p className="font-semibold text-gray-700 text-sm">
                      Photo{" "}
                    </p>
                    <div className="border-2 border-[#d8acff] min-w-56 max-w-64 min-h-32 max-h-36 p-1 bg-slate-100 rounded-lg">
                      {imageFile ? (
                        <Image
                          src={imageFile}
                          alt="blog photo"
                          width={200}
                          height={200}
                          className="w-full max-h-full rounded-md object-cover"
                        />
                      ) : (
                        <Image
                          src={iconDataObj.data.image}
                          alt="blog photo"
                          width={200}
                          height={200}
                          className="w-full max-h-full rounded-md object-cover"
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
                <div className="blog-update flex flex-col gap-1">
                  <p className="font-medium text-sm">
                    Description
                    <span className="text-red-600 font-medium text-sm mt-1">
                      *
                    </span>
                  </p>
                  <ReactQuill
                    // key={value}
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
                <div className="flex justify-between mt-3">
                  <AnimateButton isLoading={isLoading} width={"w-52"}>
                    <LiaFileMedicalSolid size={20} />
                    Update Changes
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

export default UpdateBlog;
