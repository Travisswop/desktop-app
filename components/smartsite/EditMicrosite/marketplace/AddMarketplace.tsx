import Image from 'next/image';
import React, { useCallback, useEffect, useState } from 'react';
import { useUser } from '@/lib/UserContext';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from '@nextui-org/react';
import { LiaFileMedicalSolid } from 'react-icons/lia';
import useSmartSiteApiDataStore from '@/zustandStore/UpdateSmartsiteInfo';
import { FaAngleDown, FaTimes } from 'react-icons/fa';
import AnimateButton from '@/components/ui/Button/AnimateButton';
import { MdInfoOutline } from 'react-icons/md';
import productImg from '@/public/images/product.png';
import toast from 'react-hot-toast';
import getCollectionData from '@/utils/fetchingData/getCollectionData';
import { createMarketPlace } from '@/actions/handleMarketPlace';

interface Collection {
  _id: string;
  name: string;
  mint_address: string;
  image: string;
}
const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

const AddMarketplace = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nftList, setNftList] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [collections, setCollections] = useState<Collection[]>([]);

  const { accessToken, user } = useUser();

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      setError(new Error('Access token is required.'));
      setLoading(false);
      return;
    }

    try {
      const { data } = await getCollectionData(accessToken);
      setCollections(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error('An unexpected error occurred.')
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      fetchData();
    } else {
      const timeoutId = setTimeout(() => {
        if (!accessToken) {
          setError(new Error('Access token is required.'));
          setLoading(false);
        }
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [accessToken, fetchData]);

  const handleSelectTemplate = async (
    collectionId: string,
    collectionName: string
  ) => {
    // setIsLoading(true);
    setSelectedTemplate(null);
    setNftList([]);
    setSelectedCollection(collectionName);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getNFTListByCollectionAndUser`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            userId: user?._id || '',
            collectionId: collectionId,
          }),
        }
      );
      if (!response.ok) {
        throw new Error('Something went wrong');
      }
      const { data } = await response.json();

      setNftList(data);
    } catch (error) {
      console.error('Error fetching template details:', error);
      toast.error('Error fetching template details.');
    } finally {
      // setIsLoading(false);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    if (!selectedTemplate) {
      toast.error('Please select a NFT');
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
        template: {
          templateId: selectedTemplate._id,
          ...selectedTemplate,
        },
      };

      const response = await createMarketPlace(
        payload,
        accessToken || ''
      );
      if (!response) {
        throw new Error('Marketplace creating failed');
      }
      toast.success('Marketplace created successfully');
      handleRemoveIcon('Marketplace');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
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
                You will be able to set the icon type, choose an icon,
                specify a button name, provide a link, and add a
                description.
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
        onClick={() => handleRemoveIcon('Marketplace')}
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
                        {selectedTemplate.price}{' '}
                        {selectedTemplate.currency}
                      </p>
                    </div>
                    {selectedTemplate.mintLimit && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Mint Limit
                        </p>
                        <p className="font-mono text-sm">
                          #{selectedTemplate.mintLimit}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-center">
                No item selected.
              </p>
            )}
          </div>
        </div>

        {/* Dropdown Section */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex flex-col w-full gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-700">
                Select Collection
              </h3>
            </div>

            <Dropdown
              className="w-full rounded-lg"
              placement="bottom-start"
            >
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
                {collections.length > 0 ? (
                  collections.map((collection: any) => (
                    <DropdownItem
                      key={collection._id}
                      onClick={() =>
                        handleSelectTemplate(
                          collection._id,
                          collection.name
                        )
                      }
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

        {/* NFT List Dropdown Section */}
        <div className="flex items-center justify-between mt-2 mb-2">
          <div className="flex flex-col w-full gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-700">
                Select NFT
              </h3>
            </div>

            <Dropdown
              className="w-full rounded-lg"
              placement="bottom-start"
            >
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
                        <span className="text-gray-500">
                          Select an NFT
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
                          {nft.name || 'Unnamed NFT'}
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
