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
import { currencyItems, icon, newIcons } from "@/util/data/smartsiteIconData";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/react";
import { AiOutlineDownCircle } from "react-icons/ai";
import { describe } from "node:test";
import { postSwopPay } from "@/actions/swopPay";
import { FaTimes } from "react-icons/fa";

const AddSwopPay = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state);
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputError, setInputError] = useState<any>({});
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>("");
  const [selectedIcon, setSelectedIcon] = useState({
    id: 4,
    name: "Solana",
    icon: icon.appIconSolana,
    characterText: "$",
  });

  // console.log("file error", fileError);

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

    const info: any = {
      micrositeId: state.data._id,
      title: formData.get("title"),
      price: formData.get("price"),
      description: formData.get("description"),
      paymentUrl: formData.get("paymentUrl"),
      currency: selectedIcon.name,
      imageUrl: imageFile,
    };

    // console.log("info", info);

    let errors = {};

    if (!info.title) {
      errors = { ...errors, title: "title is required" };
    }
    if (!info.price) {
      errors = { ...errors, headline: "price is required" };
    }
    if (!info.description) {
      errors = { ...errors, description: "description is required" };
    }
    if (info.description && info?.description?.length < 5) {
      errors = {
        ...errors,
        description: "description must be atleast 5 characters long",
      };
    }
    if (!info.paymentUrl) {
      errors = { ...errors, image: "product url is required" };
    }
    if (!info.currency) {
      errors = { ...errors, image: "currency is required" };
    }
    if (!info.imageUrl) {
      errors = { ...errors, image: "image is required" };
    }

    if (Object.keys(errors).length > 0) {
      setInputError(errors);
      setIsLoading(false);
    } else {
      setInputError("");

      try {
        const imageUrl = await sendCloudinaryImage(info.imageUrl);
        if (!imageUrl) {
          return toast.error("photo upload failed!");
        }
        info.imageUrl = imageUrl;
        const data = await postSwopPay(info, sesstionState.accessToken);
        // console.log("data", data);

        if ((data.state = "success")) {
          toast.success("product created successfully");
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

  const currencyList: any = currencyItems;

  // console.log("selectedIcon", selectedIcon);

  return (
    <form
      onSubmit={handleFormSubmit}
      className="bg-white rounded-xl shadow-small p-6 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-gray-700">Product Purchase</h1>
        <button type="button" onClick={() => handleRemoveIcon("Swop Pay")}>
          <FaTimes size={20} />
        </button>
      </div>

      <div className="flex justify-between gap-10">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-gray-700 text-sm">
                Upload Product Photo
                <span className="text-red-600 font-medium text-sm mt-1">*</span>
              </p>
              <div className="border-2 border-[#d8acff] min-w-40 max-w-56 min-h-40 max-h-56 p-1 bg-slate-100 rounded-lg">
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
              <CustomFileInput handleFileChange={handleFileChange} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="title" className="font-medium text-sm">
              Product Name
              <span className="text-red-600 font-medium text-sm mt-1">*</span>
            </label>
            <div>
              <input
                type="text"
                id="title"
                name="title"
                className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
                placeholder={"Enter product name"}
                // required
              />
              {inputError.title && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  product name is required
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="paymentUrl" className="font-medium text-sm">
              Product Url
              <span className="text-red-600 font-medium text-sm mt-1">*</span>
            </label>
            <input
              type="text"
              id="paymentUrl"
              name="paymentUrl"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
              placeholder={"Enter Product Url"}
              //   required
            />
            {inputError.headline && (
              <p className="text-red-600 font-medium text-sm">
                product url is required
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-gray-700">Select Currency</h3>

        <Image
          alt="app-icon"
          src={selectedIcon.icon}
          className="w-4 h-auto"
          // style={tintStyle}
          quality={100}
        />

        <Dropdown className="w-max rounded-lg" placement="bottom-start">
          <DropdownTrigger>
            <div className={`flex items-center`}>
              <button type="button">
                <AiOutlineDownCircle size={20} color="gray" />
              </button>
              <div className="hidden text-xs text-gray-600 px-2 w-28 py-1.5 bg-slate-200 shadow-medium z-50 absolute left-6 top-0 group-hover:flex justify-center">
                <p>select icon type</p>
              </div>
            </div>
          </DropdownTrigger>
          <DropdownMenu
            disabledKeys={["title"]}
            aria-label="Static Actions"
            className="p-2"
          >
            <DropdownItem
              key={"title"}
              className=" hover:!bg-white opacity-100 cursor-text disabled dropDownTitle"
            >
              <p>Choose Icon</p>
            </DropdownItem>
            {currencyList.map((data: any) => (
              <DropdownItem
                key={data.id}
                onClick={() =>
                  setSelectedIcon({
                    id: data.id,
                    name: data.name,
                    icon: data.icon,
                    characterText: "$",
                  })
                }
                className="border-b rounded-none hover:rounded-md"
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Image
                    src={data.icon}
                    alt={data.name}
                    className="w-4 h-auto"
                    quality={100}
                    //   style={tintStyle}
                  />
                  {data.name}
                </div>
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="price" className="font-medium text-sm">
          Price
          <span className="text-red-600 font-medium text-sm mt-1">*</span>
        </label>
        <div>
          <div className="relative">
            <p className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600">
              <Image
                src={selectedIcon.icon}
                alt={selectedIcon.name}
                width={20}
                height={20}
              />
            </p>
            <input
              type="text"
              name="price"
              id="price"
              defaultValue={50}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-11 py-2 text-gray-700 bg-gray-100"
              placeholder={"Enter product price"}
              required
            />
          </div>
          {inputError.price && (
            <p className="text-red-600 font-medium text-sm mt-1">
              price is required
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="font-medium text-sm">
          Description
          <span className="text-red-600 font-medium text-sm mt-1">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
          placeholder={"Enter description"}
          //   required
        />
        {inputError.description && (
          <p className="text-red-600 font-medium text-sm">
            {inputError.description}
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

export default AddSwopPay;
