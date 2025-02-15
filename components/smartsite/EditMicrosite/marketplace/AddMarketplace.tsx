import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useUser } from "@/lib/UserContext";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from "@nextui-org/react";
import { IoLinkOutline } from "react-icons/io5";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { FaAngleDown, FaTimes } from "react-icons/fa";
import { icon, newIcons } from "@/components/util/data/smartsiteIconData";
import { isEmptyObject } from "@/components/util/checkIsEmptyObject";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { MdInfoOutline } from "react-icons/md";
import { InfoBarIconMap, InfoBarSelectedIconType } from "@/types/smallIcon";
import contactCardImg from "@/public/images/IconShop/appIconContactCard.png";
import productImg from "@/public/images/product.png";
import toast from "react-hot-toast";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { createMarketPlace } from "@/actions/handleMarketPlace";

const nftCollection = [
  {
    name: "collectible",
    mint_address: "Tf39QyKnuY99j1pUoNrEyAcBAxSmoogYSmuRiSAfhjg",
    image:
      "https://quicknode.quicknode-ipfs.com/ipfs/QmPrxJi3rVPQZVqLnEfTEx1Urb9FKbGSk1J2HYrLqnyZyn",
  },
  {
    name: "subscription",
    mint_address: "8ngpZFQaARzprfJewfdTJJqs1MP6rE4xc1tpwbntADFp",
    image:
      "https://quicknode.quicknode-ipfs.com/ipfs/QmSvPHcb7T2AVd8ebaYgKfRBwDXNwzTHUJ7D19LRmaRHia",
  },
  {
    name: "membership",
    mint_address: "CszXhmv3c36NmNxKRfYsttWE3DTA32krStf3rqpyaidq",
    image:
      "https://quicknode.quicknode-ipfs.com/ipfs/QmSdMaGMHjKvjNxLyta33MU5NzKLJEUQb82we2JjtRjwU7",
  },
  {
    name: "coupon",
    mint_address: "FyaZ99koNBLavhTEFkHCYbXECFfvwN3iBcDsBAkGa2LM",
    image:
      "https://quicknode.quicknode-ipfs.com/ipfs/QmbyMj44c159eBx5wmAJuDVb7DoDuBjr9N6dsx7CgopwwA",
  },
  {
    name: "menu",
    mint_address: "6upDsvqvX87Hzr5zYL87BED7U998S3WgHNcdBC9zwznn",
    image:
      "https://quicknode.quicknode-ipfs.com/ipfs/QmdSukD82bzFnxAwWunpKdzHmm8zpXSv9sbRAWR1xgLcVm",
  },
  {
    name: "phygital",
    mint_address: "23WshXUoW2Mi38E3XFL8NeqcKZ4PXpN1PTKBGJzZzu4q",
    image:
      "https://quicknode.quicknode-ipfs.com/ipfs/QmSEdUJoU9L2vkKCpvMTjkL8yhsXKPJqdaUg62wxaK9AqG",
  },
];
const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

const AddMarketplace = ({ handleRemoveIcon, handleToggleIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [nftList, setNftList] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState("");

  const { accessToken, user } = useUser();

  // useEffect(() => {
  //   const fetchTemplates = async () => {
  //     try {
  //       const response = await fetch(
  //         `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getAllTemplatesAndCollections`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${accessToken}`,
  //           },
  //         }
  //       );
  //       const data = await response.json();
  //       if (data.state === 'success') {
  //         const templatesData = data.data.flatMap((item: any) =>
  //           Object.values(item.templatesByNftType)
  //             .flat()
  //             .map((template: any) => ({
  //               collectionId: item.collection.id,
  //               templateId: template.templateId,
  //               name: template.metadata.name,
  //               description: template.metadata.description,
  //               image: template.metadata.image,
  //             }))
  //         );
  //         setTemplates(templatesData);
  //       } else {
  //         toast.error('Failed to fetch templates.');
  //       }
  //     } catch (error) {
  //       console.error('Error fetching templates:', error);
  //       toast.error('Error fetching templates.');
  //     }
  //   };
  //   fetchTemplates();
  // }, []);

  const handleSelectTemplate = async (
    collectionId: string,
    collectionName: string
  ) => {
    // setIsLoading(true);
    setSelectedTemplate(null);
    setNftList([]);
    setSelectedCollection(collectionName);
    try {
      console.log("collectionid", collectionId);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getNFTListByCollectionAndUser`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            userId: user._id,
            collectionId: collectionId,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Something went wrong");
      }
      const { data } = await response.json();
      console.log("data from action", data);
      setNftList(data);
    } catch (error) {
      console.error("Error fetching template details:", error);
      toast.error("Error fetching template details.");
    } finally {
      // setIsLoading(false);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    if (!selectedTemplate) {
      toast.error("Please select a NFT");
      return;
    }

    try {
      // const response = await fetch(
      //   `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/createMarketPlace`,
      //   {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //       authorization: `Bearer ${accessToken}`,
      //     },
      //     body: JSON.stringify({
      //       micrositeId: state.data._id,
      //       collectionId: selectedTemplate.collectionId,
      //       templateId: selectedTemplate._id,
      //       itemName: selectedTemplate.name,
      //       itemImageUrl: selectedTemplate.image,
      //       itemDescription: selectedTemplate.description,
      //       itemPrice: selectedTemplate.price,
      //       itemCategory: selectedTemplate.nftType,
      //     }),
      //   }
      // );

      setIsLoading(true);

      const payload = {
        micrositeId: state.data._id,
        collectionId: selectedTemplate.collectionId,
        templateId: selectedTemplate._id,
        itemName: selectedTemplate.name,
        itemImageUrl: selectedTemplate.image,
        itemDescription: selectedTemplate.description,
        itemPrice: selectedTemplate.price,
        itemCategory: selectedTemplate.nftType,
      };

      const response = await createMarketPlace(payload, accessToken);

      console.log("response", response);
      if (response.state !== "success") {
        throw new Error("");
      }
      toast.success("Marketplace crated successfully");
      handleRemoveIcon("Marketplace");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong! Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
      {/* Top Section */}
      <div className="flex items-end gap-1 justify-center">
        <h2 className="font-semibold text-gray-700 text-xl text-center">
          Marketplace
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                You will be able to set the icon type, choose an icon, specify a
                button name, provide a link, and add a description.
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
      <button
        className="absolute top-3 right-3"
        type="button"
        onClick={() => handleRemoveIcon("Marketplace")}
      >
        <FaTimes size={18} />
      </button>

      {/* Product Rendering Section */}
      <div className="flex flex-col gap-2 mt-4 px-10 2xl:px-[10%]">
        <div className="w-full rounded-xl border border-gray-300 p-3">
          <div className="w-full flex flex-col gap-3">
            {selectedTemplate ? (
              <>
                <div className="flex justify-center">
                  <Image
                    src={selectedTemplate.image}
                    width={300}
                    height={400}
                    alt={selectedTemplate.name}
                    className="w-48 h-auto rounded-full"
                  />
                </div>
                <div className="px-10 flex flex-col  gap-2">
                  <p className="text-gray-700 font-semibold text-center">
                    {selectedTemplate.name}
                  </p>
                  <p className="text-gray-600 font-normal text-sm text-center">
                    {selectedTemplate.description}
                  </p>
                  <div className="flex justify-between items-center my-4">
                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-bold uppercase">
                        {selectedTemplate.price} {selectedTemplate.currency}
                      </p>
                    </div>
                    {selectedTemplate.supplyLimit && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Mint Limit</p>
                        <p className="font-mono text-sm">
                          #{selectedTemplate.supplyLimit}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-center">No item selected.</p>
            )}
          </div>
        </div>

        {/* Dropdown Section */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex flex-col w-full gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-700">Select Collection</h3>
            </div>

            <Dropdown className="w-full rounded-lg" placement="bottom-start">
              <DropdownTrigger>
                <button className="bg-white w-full flex justify-between items-center rounded-lg px-4 py-3 text-sm font-medium border border-gray-200 hover:border-gray-300 transition-colors">
                  <span className="flex items-center gap-3">
                    {selectedCollection ? (
                      <>
                        <Image
                          src={`/assets/collections/${selectedCollection}.png`}
                          alt={selectedCollection}
                          width={24}
                          height={24}
                          className="rounded-full object-cover"
                        />
                        <span className="truncate">
                          {capitalizeFirstLetter(selectedCollection)}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                        <span className="text-gray-500">
                          Choose a collection
                        </span>
                      </>
                    )}
                  </span>
                  <FaAngleDown className="text-gray-400" />
                </button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Select Template"
                className="w-full max-h-[300px] overflow-y-auto"
              >
                {nftCollection.length > 0 ? (
                  nftCollection.map((template: any) => (
                    <DropdownItem
                      key={template.mint_address}
                      onClick={() =>
                        handleSelectTemplate(
                          template.mint_address,
                          template.name
                        )
                      }
                      className="py-2 px-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={`/assets/collections/${template.name}.png`}
                          alt={template.name}
                          width={24}
                          height={24}
                          className="rounded-full object-cover"
                        />
                        <span className="truncate">
                          {capitalizeFirstLetter(template.name)}
                        </span>
                      </div>
                    </DropdownItem>
                  ))
                ) : (
                  <DropdownItem className="text-gray-500 text-center py-4">
                    No collections available
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {/* NFT List Dropdown Section */}
        <div className="flex items-center justify-between mt-2 mb-2">
          <div className="flex flex-col w-full gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-700">Select NFT</h3>
            </div>

            <Dropdown className="w-full rounded-lg" placement="bottom-start">
              <DropdownTrigger>
                <button className="bg-white w-full flex justify-between items-center rounded-lg px-4 py-3 text-sm font-medium border border-gray-200 hover:border-gray-300 transition-colors">
                  <span className="flex items-center gap-3">
                    {selectedTemplate ? (
                      <>
                        <Image
                          src={selectedTemplate.image || productImg}
                          alt={selectedTemplate.name}
                          width={24}
                          height={24}
                          className="rounded-full object-cover"
                        />
                        <span className="truncate">
                          {selectedTemplate.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                        <span className="text-gray-500">Select an NFT</span>
                      </>
                    )}
                  </span>
                  <FaAngleDown className="text-gray-400" />
                </button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Select Template"
                className="w-full max-h-[300px] overflow-y-auto"
              >
                {nftList.length > 0 ? (
                  nftList.map((nft: any) => (
                    <DropdownItem
                      key={nft._id}
                      onClick={() => setSelectedTemplate(nft)}
                      className="py-2 px-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={nft.image || productImg}
                          alt={nft.name}
                          width={24}
                          height={24}
                          className="rounded-full object-cover"
                        />
                        <span className="truncate">
                          {nft.name || "Unnamed NFT"}
                        </span>
                      </div>
                    </DropdownItem>
                  ))
                ) : (
                  <DropdownItem className="text-gray-500 text-center py-4">
                    No NFTs available
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {/* Category Input Section */}
        <div>
          <div className="flex justify-center">
            <AnimateButton
              whiteLoading={true}
              className="bg-black text-white py-2 !border-0"
              isLoading={isLoading}
              width="w-52"
              isDisabled={!selectedTemplate}
              onClick={handleCreateMarket}
            >
              <LiaFileMedicalSolid size={20} />
              Create
            </AnimateButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMarketplace;
