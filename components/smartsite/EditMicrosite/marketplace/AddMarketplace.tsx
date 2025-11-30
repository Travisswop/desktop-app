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
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { FaAngleDown, FaMinusCircle, FaTimes } from "react-icons/fa";
import { MdInfoOutline } from "react-icons/md";
import productImg from "@/public/images/product.png";
import toast from "react-hot-toast";
import getCollectionData from "@/utils/fetchingData/getCollectionData";
import { createMarketPlace } from "@/actions/handleMarketPlace";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { Loader } from "lucide-react";
import { useParams } from "next/navigation";

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

interface ExistingMarketplaceItem {
  _id: string;
  templateId: {
    _id: string;
  };
}

const capitalizeFirstLetter = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

const API_ENDPOINTS = {
  NFT_LIST: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getNFTListByCollectionAndUser`,
  MARKETPLACE_LIST: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/marketplace/getPublicMicrositeMarketPlace`,
} as const;

const NFT_TYPE_LABELS: Record<string, string> = {
  phygital: "Products",
  coupon: "Coupons",
  membership: "Memberships",
  subscription: "Subscriptions",
  collectible: "Collectibles",
  point: "Points",
};

const AddMarketplace = ({ onCloseModal }: any) => {
  // const smartsiteData = useSmartSiteApiDataStore((state: any) => state.data);

  // console.log("smartsiteData", smartsiteData);

  const { accessToken, user } = useUser();

  // Get smartsite ID from route params
  const params = useParams();
  const smartsiteId = params?.editId as string;

  console.log("smartsiteId", smartsiteId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nftList, setNftList] = useState<NFT[]>([]);
  const [removedNftIds, setRemovedNftIds] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [existingMarketplaceItems, setExistingMarketplaceItems] = useState<
    ExistingMarketplaceItem[]
  >([]);

  const hasCollections = useMemo(() => collections.length > 0, [collections]);

  // Filter out already added NFTs and removed NFTs
  const filteredNfts = useMemo(() => {
    const existingTemplateIds = new Set(
      existingMarketplaceItems
        .map((item) => item?.templateId?._id)
        .filter(Boolean)
    );

    return nftList.filter((nft) => {
      const id = nft?._id;
      if (!id) return false;
      if (removedNftIds.includes(id)) return false;
      if (existingTemplateIds.has(id)) return false;
      return true;
    });
  }, [nftList, removedNftIds, existingMarketplaceItems]);

  // Group NFTs by type
  const groupedNfts = useMemo(() => {
    return filteredNfts.reduce((groups, nft) => {
      const type = nft?.nftType || "other";
      if (!groups[type]) groups[type] = [];
      groups[type].push(nft);
      return groups;
    }, {} as Record<string, NFT[]>);
  }, [filteredNfts]);

  const fetchExistingMarketplace = useCallback(async () => {
    if (!accessToken || !smartsiteId) return;

    try {
      const response = await fetch(API_ENDPOINTS.MARKETPLACE_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          microsite_id: smartsiteId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch existing marketplace items");
      }

      const { data } = await response.json();
      setExistingMarketplaceItems(data || []);
    } catch (error) {
      console.error("Error fetching existing marketplace:", error);
    }
  }, [accessToken, smartsiteId]);

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
        setRemovedNftIds([]);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
        toast.error("Error fetching NFTs");
      }
    },
    [accessToken, user?._id]
  );

  const handleSelectCollection = useCallback(
    async (collection: Collection) => {
      setNftList([]);
      setRemovedNftIds([]);
      setSelectedCollection(collection);
      await fetchNFTsForCollection(collection);
    },
    [fetchNFTsForCollection]
  );

  const handleRemoveNft = useCallback((nftId: string) => {
    setRemovedNftIds((prev) => [...prev, nftId]);
  }, []);

  const handleCreateMarket = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedCollection) {
        toast.error("Please select a collection");
        return;
      }

      if (filteredNfts.length === 0) {
        toast.error("Please keep at least one item to save");
        return;
      }

      if (!smartsiteId) {
        toast.error("SmartSite data not available");
        return;
      }

      try {
        setIsLoading(true);

        const payload = {
          micrositeId: smartsiteId,
          multipleItems: filteredNfts.map((nft) => ({ ...nft })),
          template: {},
        };

        console.log("payload create marketplace", payload);

        const response = await createMarketPlace(payload, accessToken || "");

        console.log("res for market", response);

        if (!response) {
          throw new Error("Marketplace creation failed");
        }

        toast.success("Items added successfully");
        onCloseModal();
      } catch (error: any) {
        console.error("Marketplace creation error:", error);
        toast.error(error.message || "Failed to add items");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedCollection, filteredNfts, smartsiteId, accessToken, onCloseModal]
  );

  useEffect(() => {
    if (accessToken) {
      fetchCollections();
      fetchExistingMarketplace();
    } else {
      const timeoutId = setTimeout(() => {
        if (!accessToken) {
          setError(new Error("Access token is required."));
          setLoading(false);
        }
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [accessToken, fetchCollections, fetchExistingMarketplace]);

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
    <div className="relative flex flex-col gap-4 max-h-[80vh]">
      <div className="flex items-end gap-1 justify-center sticky top-0 bg-white z-10 pb-4">
        <h2 className="font-semibold text-gray-700 text-xl text-center">
          Marketplace
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                Select a collection and choose items to add to your marketplace
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

      <div className="flex flex-col gap-4 sm:px-10 2xl:px-[5%] overflow-y-auto">
        {/* NFT Display Section */}
        {selectedCollection && Object.keys(groupedNfts).length > 0 ? (
          <div className="flex flex-col gap-6 mt-4">
            {Object.entries(groupedNfts).map(([type, nfts]) => (
              <div key={type} className="flex flex-col gap-3">
                <h3 className="font-medium text-gray-700 capitalize">
                  {NFT_TYPE_LABELS[type] || type}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nfts.map((nft) => (
                    <div
                      key={nft._id}
                      className="relative bg-white rounded-xl shadow-small hover:shadow-medium p-4"
                    >
                      <button
                        onClick={() => handleRemoveNft(nft._id)}
                        className="absolute top-2 right-2 z-10"
                        title="Remove item"
                      >
                        <FaMinusCircle />
                      </button>

                      <div className="flex flex-col items-center gap-3">
                        <div className="w-32 h-32 relative">
                          <Image
                            src={nft.image || productImg}
                            alt={nft.name || "NFT"}
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                        <div className="w-full text-center">
                          <p className="font-semibold text-gray-700 text-sm truncate">
                            {nft.name || "Unnamed NFT"}
                          </p>
                          {nft.description && (
                            <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                              {nft.description}
                            </p>
                          )}
                          <div className="flex justify-center items-center gap-2 mt-3">
                            <span className="font-bold text-sm">
                              {nft.price || 0}
                            </span>
                            <span className="text-xs text-gray-500 uppercase">
                              {nft.currency || "SOL"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[200px] bg-gray-50 rounded-xl border border-gray-200 mt-4">
            <p className="text-gray-500 text-center px-4">
              {selectedCollection
                ? "No items available in this collection"
                : "Please select a collection to view items"}
            </p>
          </div>
        )}
        {/* Collection Selector */}
        <div className="flex flex-col w-full gap-2">
          <h3 className="font-medium">Select Category</h3>
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
                        {NFT_TYPE_LABELS[selectedCollection.name] ||
                          capitalizeFirstLetter(selectedCollection.name)}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                      <span className="text-gray-500">Choose a category</span>
                    </>
                  )}
                </span>
                <FaAngleDown className="text-gray-400" />
              </button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Select Category"
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
                        {NFT_TYPE_LABELS[collection.name] ||
                          capitalizeFirstLetter(collection.name)}
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

        {/* Save Button */}
        <div className="sticky bottom-0 bg-white pt-4 pb-2">
          <PrimaryButton
            onClick={handleCreateMarket}
            disabled={
              isLoading || !selectedCollection || filteredNfts.length === 0
            }
            className="w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              `Save ${filteredNfts.length} Item${
                filteredNfts.length !== 1 ? "s" : ""
              }`
            )}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default AddMarketplace;
