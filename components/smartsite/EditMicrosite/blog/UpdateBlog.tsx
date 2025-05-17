import React, { useState, useRef, useEffect } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
// import { toast } from "react-toastify";
import { FaTimes } from "react-icons/fa";
// import AnimateButton from "@/components/Button/AnimateButton";
// import { handleDeleteAppIcon } from "@/actions/appIcon";
// import {
//   handleDeleteContactCard,
//   updateContactCard,
// } from "@/actions/contactCard";
import { MdDelete, MdInfoOutline } from "react-icons/md";
// import { sendCloudinaryImage } from "@/util/SendCloudinaryImage";
// import "react-quill/dist/quill.snow.css"; // Add this line if not already present
// import ReactQuill from "react-quill";
import Image from "next/image";
import CustomFileInput from "@/components/CustomFileInput";
// import { icon } from "@/util/data/smartsiteIconData";
import { deleteBlog, updateBlog } from "@/actions/blog";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { Editor } from "@tinymce/tinymce-react";
import { Tooltip } from "@nextui-org/react";
import toast from "react-hot-toast";
import { useUser } from "@/lib/UserContext";

const UpdateBlog = ({ iconDataObj, isOn, setOff }: any) => {
  //const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value
  const { accessToken } = useUser();
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
        if (accessToken) {
          const data = await updateBlog(info, accessToken);
          // console.log("data for update blog", data);

          if ((data.state = "success")) {
            setOff();
            toast.success("Blog updated successfully");
          } else {
            toast.error("Something went wrong!");
          }
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
      if (accessToken) {
        const data: any = await deleteBlog(submitData, accessToken);

        if (data && data?.state === "success") {
          setOff();
          toast.success("Blog deleted successfully");
        } else {
          toast.error("Something went wrong!");
        }
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
            className="modal-content hide-scrollbar w-96 md:w-[46rem] h-[90vh] overflow-auto bg-white relative rounded-xl"
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
                <div className="flex items-end gap-1 justify-center">
                  <h2 className="font-semibold text-gray-700 text-xl text-center">
                    Blog
                  </h2>
                  <div className="translate-y-0.5">
                    <Tooltip
                      size="sm"
                      content={
                        <span className="font-medium">
                          Write a blog and host it right on your swop smart
                          site.
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
                <div className="flex justify-between gap-4">
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex flex-col gap-2">
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
                              src={iconDataObj.data.image}
                              alt="blog photo"
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              className="rounded-md object-cover"
                            />
                          )}
                          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2">
                            <CustomFileInput
                              handleFileChange={handleFileChange}
                            />
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
                </div>
                <div className="blog-update flex flex-col gap-1">
                  <p className="font-medium text-sm">
                    Description
                    <span className="text-red-600 font-medium text-sm mt-1">
                      *
                    </span>
                  </p>
                  {/* <ReactQuill
                    // key={value}
                    placeholder="Enter Description"
                    theme="snow"
                    value={value}
                    onChange={setValue}
                  /> */}
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
                <div className="flex justify-between mt-3">
                  <AnimateButton
                    whiteLoading={true}
                    className="bg-black text-white py-2 !border-0"
                    isLoading={isLoading}
                    width={"w-52"}
                  >
                    <LiaFileMedicalSolid size={20} />
                    Update Changes
                  </AnimateButton>
                  <AnimateButton
                    whiteLoading={true}
                    className="bg-black text-white py-2 !border-0"
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
