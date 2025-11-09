import Image from "next/image";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useUser } from "@/lib/UserContext";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from "@nextui-org/react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { FaAngleDown, FaTimes } from "react-icons/fa";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { MdInfoOutline } from "react-icons/md";
import productImg from "@/public/images/product.png";
import toast from "react-hot-toast";
import getCollectionData from "@/utils/fetchingData/getCollectionData";
import { createMarketPlace } from "@/actions/handleMarketPlace";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { Loader } from "lucide-react";

interface Collection {
  _id: string;
  name: string;
  mint_address: string;
  image: string;
}

interface NFT {
  _id: string;
  name: string;
  image: string;
  description?: string;
  price?: number;
  currency?: string;
  mintLimit?: number;
  collectionId?: string;
  nftType?: string;
}

// interface AddMarketplaceProps {
//   handleRemoveIcon: (iconType: string) => void;
// }

const capitalizeFirstLetter = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

const API_ENDPOINTS = {
  NFT_LIST: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getNFTListByCollectionAndUser`,
} as const;

const AddMarketplace = ({ onCloseModal }: any) => {
  const smartsiteData = useSmartSiteApiDataStore((state: any) => state.data);

  const { accessToken, user } = useUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NFT | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nftList, setNftList] = useState<NFT[]>([]);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);

  const isFormValid = useMemo(() => !!selectedTemplate, [selectedTemplate]);
  const hasCollections = useMemo(() => collections.length > 0, [collections]);
  const hasNfts = useMemo(() => nftList.length > 0, [nftList]);

  const fetchCollections = useCallback(async () => {
    if (!accessToken) {
      setError(new Error("Access token is required."));
      setLoading(false);
      return;
    }

    try {
      const { data } = await getCollectionData(accessToken);
      setCollections(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(new Error(errorMessage));
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchNFTsForCollection = useCallback(
    async (collection: Collection) => {
      if (!accessToken || !user?._id) {
        toast.error("Authentication required");
        return;
      }

      try {
        const response = await fetch(API_ENDPOINTS.NFT_LIST, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            userId: user._id,
            collectionId: collection._id,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch NFTs");
        }

        const { data } = await response.json();
        setNftList(data);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
        toast.error("Error fetching NFTs");
      }
    },
    [accessToken, user?._id]
  );

  const handleSelectCollection = useCallback(
    async (collection: Collection) => {
      setSelectedTemplate(null);
      setNftList([]);
      setSelectedCollection(collection);
      await fetchNFTsForCollection(collection);
    },
    [fetchNFTsForCollection]
  );

  const handleSelectNFT = useCallback((nft: NFT) => {
    setSelectedTemplate(nft);
  }, []);

  const handleCreateMarket = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedTemplate) {
        toast.error("Please select an NFT");
        return;
      }

      if (!smartsiteData?._id) {
        toast.error("SmartSite data not available");
        return;
      }

      try {
        setIsLoading(true);

        const payload = {
          micrositeId: smartsiteData._id,
          template: {
            templateId: selectedTemplate._id,
            ...selectedTemplate,
          },
        };

        const response = await createMarketPlace(payload, accessToken || "");

        if (!response) {
          throw new Error("Marketplace creation failed");
        }

        toast.success("Marketplace created successfully");
        onCloseModal();
      } catch (error: any) {
        console.error("Marketplace creation error:", error);
        toast.error(error.message || "Failed to create marketplace");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedTemplate, smartsiteData?._id, accessToken, onCloseModal]
  );

  useEffect(() => {
    if (accessToken) {
      fetchCollections();
    } else {
      const timeoutId = setTimeout(() => {
        if (!accessToken) {
          setError(new Error("Access token is required."));
          setLoading(false);
        }
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [accessToken, fetchCollections]);

  if (loading) {
    return (
      <div className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
        <div className="flex items-center justify-center h-32">
          <p className="text-red-500 text-center">{error.message}</p>
        </div>
        <button
          className="absolute top-3 right-3"
          type="button"
          onClick={() => onCloseModal()}
        >
          <FaTimes size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-4">
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
            <button type="button">
              <MdInfoOutline />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:px-10 2xl:px-[10%]">
        <div className="w-full rounded-xl border border-gray-300 p-3">
          <div className="w-full flex flex-col gap-3">
            {selectedTemplate ? (
              <>
                <div className="flex justify-center">
                  <Image
                    src={selectedTemplate.image || productImg}
                    width={300}
                    height={400}
                    alt={selectedTemplate.name || "NFT"}
                    className="w-48 h-auto rounded-full"
                    priority
                  />
                </div>
                <div className="px-10 flex flex-col gap-2">
                  <p className="text-gray-700 font-semibold text-center">
                    {selectedTemplate.name || "Unnamed NFT"}
                  </p>
                  <p className="text-gray-600 font-normal text-sm text-center">
                    {selectedTemplate.description || "No description available"}
                  </p>
                  <div className="flex justify-between items-center my-4">
                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-bold uppercase">
                        {selectedTemplate.price || 0}{" "}
                        {selectedTemplate.currency || "SOL"}
                      </p>
                    </div>
                    {selectedTemplate.mintLimit && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Mint Limit</p>
                        <p className="font-mono text-sm">
                          #{selectedTemplate.mintLimit}
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

        <div className="flex items-center justify-between mt-6">
          <div className="flex flex-col w-full gap-2">
            <h3 className="font-medium">Select Collection</h3>
            <Dropdown className="w-full rounded-lg" placement="bottom-start">
              <DropdownTrigger>
                <button className="bg-white w-full flex justify-between items-center rounded-lg px-4 py-3 text-sm font-medium border border-gray-200 hover:border-gray-300 transition-colors">
                  <span className="flex items-center gap-3">
                    {selectedCollection ? (
                      <>
                        <Image
                          src={selectedCollection.image}
                          alt={selectedCollection.name}
                          width={24}
                          height={24}
                          className="rounded-full object-cover"
                        />
                        <span className="truncate">
                          {capitalizeFirstLetter(selectedCollection.name)}
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
                aria-label="Select Collection"
                className="w-full max-h-[300px] overflow-y-auto"
              >
                {hasCollections ? (
                  collections.map((collection) => (
                    <DropdownItem
                      key={collection._id}
                      onClick={() => handleSelectCollection(collection)}
                      className="py-2 px-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={collection.image}
                          alt={collection.name}
                          width={24}
                          height={24}
                          className="rounded-full object-cover"
                        />
                        <span className="truncate">
                          {capitalizeFirstLetter(collection.name)}
                        </span>
                      </div>
                    </DropdownItem>
                  ))
                ) : (
                  <DropdownItem
                    key="no-collections"
                    className="text-gray-500 text-center py-4"
                  >
                    No collections available
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 mb-2">
          <div className="flex flex-col w-full gap-2">
            <h3 className="font-medium">Select NFT</h3>
            <Dropdown className="w-full rounded-lg" placement="bottom-start">
              <DropdownTrigger>
                <button className="bg-white w-full flex justify-between items-center rounded-lg px-4 py-3 text-sm font-medium border border-gray-200 hover:border-gray-300 transition-colors">
                  <span className="flex items-center gap-3">
                    {selectedTemplate ? (
                      <>
                        <Image
                          src={selectedTemplate.image || productImg}
                          alt={selectedTemplate.name || "NFT"}
                          width={24}
                          height={24}
                          className="rounded-full object-cover"
                        />
                        <span className="truncate">
                          {selectedTemplate.name || "Unnamed NFT"}
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
                aria-label="Select NFT"
                className="w-full max-h-[300px] overflow-y-auto"
              >
                {hasNfts ? (
                  nftList.map((nft) => (
                    <DropdownItem
                      key={nft._id}
                      onClick={() => handleSelectNFT(nft)}
                      className="py-2 px-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={nft.image || productImg}
                          alt={nft.name || "NFT"}
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
                  <DropdownItem
                    key="no-nfts"
                    className="text-gray-500 text-center py-4"
                  >
                    No NFTs available
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        <PrimaryButton className="w-full py-3">
          {isLoading ? (
            <Loader className="w-8 h-8 animate-spin mx-auto" />
          ) : (
            "Save"
          )}
        </PrimaryButton>
      </div>
    </div>
  );
};

export default AddMarketplace;
