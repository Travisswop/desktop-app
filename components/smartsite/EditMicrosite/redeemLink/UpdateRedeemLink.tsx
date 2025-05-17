import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Switch,
  Tooltip,
} from "@nextui-org/react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import { FaAngleDown, FaTimes } from "react-icons/fa";

import filePlaceholder from "@/public/images/placeholder-photo.png";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { MdDelete, MdInfoOutline } from "react-icons/md";
import toast from "react-hot-toast";
import placeholder from "@/public/images/image_placeholder.png";
import CustomFileInput from "@/components/CustomFileInput";
import { usePrivy } from "@privy-io/react-auth";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import { usePathname } from "next/navigation";
import { deleteRedeem, postRedeem, updateRedeem } from "@/actions/redeem";
import Cookies from "js-cookie";
import { postFeed } from "@/actions/postFeed";
import { useUser } from "@/lib/UserContext";

const UpdateRedeemLink = ({ iconDataObj, isOn, setOff }: any) => {
  const { user } = usePrivy();
  const { user: userInfo } = useUser();

  const modalRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<any>({});
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  console.log("iconDataObj", iconDataObj);

  // Initialize state with default values from iconDataObj
  const [description, setDescription] = useState(
    iconDataObj?.data?.description || ""
  );
  const [linkName, setLinkName] = useState(iconDataObj?.data?.mintName || "");
  const [imageFile, setImageFile] = useState<any>(null);
  const [imageFileError, setImageFileError] = useState<string>("");
  const [pools, setPools] = useState<any>([]);
  const [isPoolLoading, setIsPoolLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<any>(null); // State to store the selected token
  const [accessToken, setAccessToken] = useState<any>(null);
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get("access-token");
      if (token) {
        setAccessToken(token);
      }
    };
    getAccessToken();
  }, []);

  const smartsiteid = usePathname();

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

  // Initialize form fields with iconDataObj values
  useEffect(() => {
    if (iconDataObj) {
      setDescription(iconDataObj.data?.description);
      setLinkName(iconDataObj.data?.mintName);

      // Set selected token if applicable
      const token = pools.find(
        (pool: any) => pool.token_symbol === iconDataObj.data?.symbol
      );
      if (token) {
        setSelectedToken(token);
      }
    }
  }, [iconDataObj, pools]);

  useEffect(() => {
    const fetchPools = async () => {
      try {
        setIsPoolLoading(true);
        const response = await fetch(
          `/api/redeem/list?privyUserId=${user?.id}`
        );
        const data = await response.json();
        if (data.success) {
          setPools(data.pools);
        } else {
          toast.error(data.message || "Failed to fetch redemption pools");
        }
      } catch (error) {
        console.error("Error fetching pools:", error);
        toast.error("Failed to fetch redemption pools");
      } finally {
        setIsPoolLoading(false);
      }
    };
    fetchPools();
  }, [user?.id]);

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

  console.log("image ifle", imageFile);

  const handleRedeemFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();

    let imageUrl = iconDataObj?.data?.imageUrl;
    if (imageFile) {
      imageUrl = await sendCloudinaryImage(imageFile);
    }

    const redeemInfo = {
      _id: iconDataObj.data._id,
      tokenType: "token",
      network:
        selectedToken?.token_name.charAt(0).toUpperCase() +
        selectedToken?.token_name.slice(1).toLowerCase(),
      imageUrl: imageUrl,
      link: selectedToken?.redeemLink || iconDataObj?.data?.link,
      mintName: linkName,
      mintLimit: selectedToken?.max_wallets || iconDataObj?.data?.mintLimit,
      amount: selectedToken?.total_amount || iconDataObj?.data?.amount,
      symbol: selectedToken?.token_symbol || iconDataObj?.data?.symbol,
      description: description,
      micrositeId: smartsiteid.split("/").pop(),
      tokenUrl: imageUrl,
    };

    try {
      const data = await updateRedeem(redeemInfo, accessToken);

      console.log("data update response", data);

      if (data.state === "success") {
        if (isSelected) {
          const id = smartsiteid.split("/").pop();
          const smartsite = userInfo?.microsites?.find(
            (microsite: any) => microsite._id == id
          );

          const payload = {
            smartsiteId: id,
            userId: userInfo?._id,
            smartsiteUserName: smartsite.name,
            smartsiteEnsName: smartsite.ens || smartsite.ensData.name,
            smartsiteProfilePic: smartsite.profilePic,
            postType: "redeem",
            content: {
              redeemName: redeemInfo.mintName,
              symbol: redeemInfo.symbol,
              network: redeemInfo.network,
              link: redeemInfo.link,
              amount: redeemInfo.amount,
              mintLimit: redeemInfo.mintLimit,
              tokenImgUrl: redeemInfo.imageUrl,
            },
          };
          await postFeed(payload, accessToken);
        }

        toast.success("Redeem updated successfully");
        closeModal();
      } else {
        toast.error("Something went wrong");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenSelect = (pool: any) => {
    setSelectedToken(pool);
  };

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    const submitData = {
      _id: iconDataObj.data?._id,
      micrositeId: iconDataObj.data?.micrositeId,
    };
    try {
      // Call delete API here
      await deleteRedeem(submitData, accessToken);
      toast.success("Redeem deleted successfully");
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete redeem");
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
            className="modal-content h-max w-96 lg:w-[34rem] bg-white relative rounded-xl p-7"
          >
            <button
              className="btn btn-sm btn-circle absolute right-4 top-[12px]"
              onClick={closeModal}
            >
              <FaTimes color="gray" />
            </button>
            <div className="relative flex flex-col gap-4">
              {/* Top part */}
              <div className="flex items-end gap-1 justify-center">
                <h2 className="font-semibold text-gray-700 text-xl text-center">
                  Update Redeem Link
                </h2>
                <div className="translate-y-0.5">
                  <Tooltip
                    size="sm"
                    content={
                      <span className="font-medium">
                        Update the portal that people can click to collect
                        tokens and collectables.
                      </span>
                    }
                    className="max-w-40 h-auto"
                  >
                    <button>
                      <MdInfoOutline />
                    </button>
                  </Tooltip>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <div className="bg-white rounded-xl shadow-medium w-full flex items-center gap-2 p-3 mb-1">
                  {imageFile ? (
                    <Image
                      className="w-14 h-14 rounded-lg"
                      src={imageFile}
                      width={120}
                      height={120}
                      quality={100}
                      alt="icon"
                    />
                  ) : (
                    <Image
                      className="w-14 h-14 rounded-lg"
                      src={iconDataObj?.data?.imageUrl || placeholder}
                      quality={100}
                      width={90}
                      height={90}
                      alt="icon"
                    />
                  )}
                  <div>
                    <p className="text-gray-700 font-medium">
                      {linkName || "Redeemable"}
                    </p>
                    <p className="text-gray-500 text-sm font-normal">
                      {description ||
                        "Click to Redeem a Free Digital Collectible"}
                    </p>
                  </div>
                </div>

                {/* Middle part */}
                <div>
                  <form
                    onSubmit={handleRedeemFormSubmit}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-full bg-white shadow-medium rounded-xl p-4">
                        <div className="bg-gray-100 rounded-xl p-4 flex flex-col items-center gap-2">
                          <div className="w-16 h-10">
                            <Image
                              src={filePlaceholder}
                              alt="placeholder"
                              className="w-10 h-auto mx-auto"
                            />
                          </div>
                          <p className="text-gray-400 font-normal text-sm">
                            Redeem Link Icon
                          </p>
                          <CustomFileInput
                            title={"Browse"}
                            handleFileChange={handleImageFileChange}
                          />
                          {imageFileError && (
                            <p className="text-red-600 font-medium text-sm mt-1">
                              {imageFileError}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="w-full">
                        {/* <div className="flex items-center gap-1 mb-1">
                          <p className="font-medium">Post in Feed</p>
                          <Switch
                            size="sm"
                            isSelected={isSelected}
                            onValueChange={setIsSelected}
                          />
                        </div> */}
                        <div className="flex flex-col">
                          <h3 className="font-semibold text-gray-700 w-44">
                            Select Token
                          </h3>
                          <Dropdown
                            className="w-full rounded-lg"
                            placement="bottom-start"
                          >
                            <DropdownTrigger>
                              <button
                                type="button"
                                className="bg-white mb-2 xl:mb-0 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small w-full"
                              >
                                <span className="flex items-center gap-2">
                                  {selectedToken
                                    ? `${selectedToken.token_symbol} | ${selectedToken.total_amount} | ${selectedToken.max_wallets}`
                                    : "Token | Amount | Limit"}
                                </span>
                                <FaAngleDown />
                              </button>
                            </DropdownTrigger>
                            <DropdownMenu
                              disabledKeys={["title"]}
                              aria-label="Static Actions"
                              className="p-2"
                            >
                              <DropdownItem
                                key={"title"}
                                className="hover:!bg-white opacity-100 cursor-text disabled dropDownTitle"
                              >
                                <p>Choose A Token</p>
                              </DropdownItem>
                              {isPoolLoading ? (
                                <DropdownItem className="border-b rounded-none hover:rounded-md">
                                  <p className="">loading...</p>
                                </DropdownItem>
                              ) : (
                                pools.map((pool: any, index: number) => (
                                  <DropdownItem
                                    key={index}
                                    onClick={() => handleTokenSelect(pool)}
                                    className="border-b rounded-none hover:rounded-md"
                                  >
                                    <div className="flex items-center gap-2 font-semibold text-sm">
                                      {`${pool.token_symbol} | ${pool.total_amount} | ${pool.max_wallets}`}
                                    </div>
                                  </DropdownItem>
                                ))
                              )}
                            </DropdownMenu>
                          </Dropdown>
                        </div>
                        <p className="font-semibold text-gray-700 mb-0.5">
                          Amount
                        </p>
                        <div>
                          <input
                            type="text"
                            name="amount"
                            value={
                              selectedToken
                                ? selectedToken.total_amount
                                : iconDataObj?.data?.amount
                            }
                            readOnly
                            className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                            placeholder={"Enter Amount"}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="w-full flex items-center gap-4">
                      <div className="w-full">
                        <p className="font-semibold text-gray-700 mb-0.5">
                          Link Name
                        </p>
                        <div>
                          <input
                            type="text"
                            name="link"
                            value={linkName}
                            onChange={(e) => setLinkName(e.target.value)}
                            className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                            placeholder={"Enter Link Name"}
                            required
                          />
                        </div>
                      </div>
                      <div className="w-full">
                        <p className="font-semibold text-gray-700 mb-0.5">
                          Mint Limit
                        </p>
                        <div>
                          <input
                            type="text"
                            name="mintLimit"
                            value={
                              selectedToken
                                ? selectedToken.max_wallets
                                : iconDataObj?.data?.mintLimit
                            }
                            readOnly
                            className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                            placeholder={"Enter Mint Limit"}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">
                        Description
                      </p>
                      <div>
                        <textarea
                          name="description"
                          className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                          placeholder="Enter description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>
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
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateRedeemLink;
