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

const UpdateEmbed = ({ iconDataObj, isOn, setOff }: any) => {
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value

  const [selectedIcon, setSelectedIcon] = useState({
    category: "X",
    categoryIcon: icon.appIconTwitter,
    placeHolder: "https://www.x.com/{xUserName}/status/{tweetID}",
    inputText: "X Embeded Link",
    url: "www.x.com",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);

  const getEmbedItems: any = embedItems;

  useEffect(() => {
    const data = getEmbedItems.find(
      (item: any) => item.category.toLowerCase() === iconDataObj.data.type
    );
    if (data) {
      setSelectedIcon(data);
    }
  }, [iconDataObj]);

  const handleUpdateEmbed = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const embedInfo = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
      link: formData.get("url"),
      type:
        selectedIcon.category === "X"
          ? "twitter"
          : selectedIcon.category.toLowerCase(),
    };
    try {
      const data: any = await updateEmbedLink(
        embedInfo,
        sesstionState.accessToken
      );
      // console.log("data,", data);

      if (data && data?.state === "success") {
        setOff();
        toast.success("embed updated successfully");
      } else {
        toast.error("something went wrong");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
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
      const data: any = await deleteEmbedLink(
        submitData,
        sesstionState.accessToken
      );
      // console.log("data,", data);

      if (data && data?.state === "success") {
        setOff();
        toast.success("embed deleted successfully");
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-700">
                    Select Embed Type
                  </h3>

                  {selectedIcon && (
                    <Image
                      alt="app-icon"
                      src={selectedIcon?.categoryIcon}
                      className="w-4 h-auto"
                      quality={100}
                    />
                  )}

                  <Dropdown
                    className="w-max rounded-lg"
                    placement="bottom-start"
                  >
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
                <div className="flex items-center gap-2 font-medium text-gray-600">
                  <p>Redirect</p>
                  <Switch
                    color="success"
                    size="sm"
                    defaultSelected
                    aria-label="Lead Captures"
                  />
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">
                  {selectedIcon.inputText} :
                </p>
                <form onSubmit={handleUpdateEmbed}>
                  <div className="relative">
                    <IoLinkOutline
                      className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                      size={20}
                    />
                    <input
                      type="text"
                      name="url"
                      defaultValue={iconDataObj.data.videoUrl}
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-11 pr-2 py-2 text-gray-700 bg-gray-100"
                      placeholder={selectedIcon.placeHolder}
                      required
                    />
                  </div>
                  <div className="flex justify-between mt-4">
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
        </div>
      )}
    </>
  );
};

export default UpdateEmbed;
