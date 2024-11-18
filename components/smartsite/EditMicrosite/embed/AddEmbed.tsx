import Image from "next/image";
import React, { useState } from "react";
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
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import AnimateButton from "../../Button/AnimateButton";
import { toast } from "react-toastify";
import { postEmbedLink } from "@/actions/embedLink";
import { FaTimes } from "react-icons/fa";

const AddEmbed = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state); //get small icon store value
  // console.log("state", state);

  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value

  const [selectedIcon, setSelectedIcon] = useState({
    category: "X",
    categoryIcon: icon.appIconTwitter,
    placeHolder: "https://www.x.com/{xUserName}/status/{tweetID}",
    inputText: "X Embeded Link",
    url: "www.x.com",
  });

  // console.log("selectted icon", selectedIcon);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleEmbed = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const embedInfo = {
      micrositeId: state.data._id,
      link: formData.get("url"),
      type:
        selectedIcon.category === "X"
          ? "twitter"
          : selectedIcon.category.toLowerCase(),
    };

    try {
      const data = await postEmbedLink(embedInfo, sesstionState.accessToken);
      // console.log("data", data);

      if ((data.state = "success")) {
        toast.success("embed created successfully");
      } else {
        toast.error("something went wrong");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // console.log("smartSiteData", state);
  // console.log("sesstionState", sesstionState);

  const getEmbedItems: any = embedItems;

  return (
    <div className="bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-700">Select Embed Type</h3>

          {selectedIcon && (
            <Image
              alt="app-icon"
              src={selectedIcon?.categoryIcon}
              className="w-4 h-auto"
              quality={100}
            />
          )}

          <Dropdown className="w-max rounded-lg" placement="bottom-start">
            <DropdownTrigger>
              <div className={`flex items-center`}>
                <button>
                  <AiOutlineDownCircle size={20} color="gray" />
                </button>
                {/* {isEmptyObject(selectedIconData) && ( */}
                <div className="hidden text-xs text-gray-600 px-2 w-28 py-1.5 bg-slate-200 shadow-medium z-50 absolute left-6 top-0 group-hover:flex justify-center">
                  <p>Embed Type</p>
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
                <p>Choose Embed Type</p>
              </DropdownItem>
              {getEmbedItems.map((data: any) => (
                <DropdownItem
                  key={data.category}
                  onClick={() =>
                    setSelectedIcon({
                      category: data.category,
                      categoryIcon: data.categoryIcon,
                      placeHolder: data.placeHolder,
                      inputText: data.inputText,
                      url: data.url,
                    })
                  }
                  className="border-b rounded-none hover:rounded-md"
                >
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Image
                      src={data.categoryIcon}
                      alt={data.category}
                      className="w-4 h-auto"
                      quality={100}
                    />
                    {data.category}
                  </div>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>
        <button type="button" onClick={() => handleRemoveIcon("Embed")}>
          <FaTimes size={20} />
        </button>
      </div>
      <div>
        <p className="font-semibold text-gray-700 mb-1">
          {selectedIcon.inputText} :
        </p>
        <form onSubmit={handleEmbed}>
          <div className="relative">
            <IoLinkOutline
              className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
              size={20}
            />
            <input
              type="text"
              name="url"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-11 py-2 text-gray-700 bg-gray-100"
              placeholder={selectedIcon.placeHolder}
              required
            />
          </div>
          <div className="flex justify-between mt-3">
            <div className="flex items-center gap-2 font-medium text-gray-600">
              <p>Redirect</p>
              <Switch
                color="success"
                size="sm"
                defaultSelected={false}
                aria-label="Lead Captures"
              />
            </div>
            <AnimateButton isLoading={isLoading} width={"w-52"}>
              <LiaFileMedicalSolid size={20} />
              Save Changes
            </AnimateButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmbed;
