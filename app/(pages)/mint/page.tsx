"use client";

import React, { useState, useEffect } from "react";
import MintCart from "@/components/MintCart";
import Link from "next/link";
import PushToMintCollectionButton from "@/components/Button/PushToMintCollectionButton";
import SaveToLocalAndNavigate from "@/components/SaveToLocalAndNavigate";
import HomePageLoading from "@/components/loading/HomePageLoading";
import getMintPageData, { GroupedTemplates } from "@/utils/fetchingData/getMintPageData";
import { useUser } from "@/lib/UserContext";

interface Template {
  templateId: string;
  metadata: {
    image: string;
    name: string;
  };
  supply: {
    limit: number;
    minted: number;
  };
}

interface GroupedByNftType {
  [nftType: string]: Template[];
}

interface Collection {
  id: string;
  metadata: {
    name: string;
  };
}

interface GroupedTemplatesByCollection {
  collection: Collection;
  templatesByNftType: GroupedByNftType;
}

const nftTypes = [
  "collectible",
  "subscription",
  "membership",
  "coupon",
  "menu",
  "phygital",
];

const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

const MintDashboard = () => {
  const [mintData, setMintData] = useState<
    { data: GroupedTemplatesByCollection[] } | { noCollections: boolean } | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { accessToken } = useUser();
  const [waitForToken, setWaitForToken] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setWaitForToken(false);
    }, 30000); // 30 seconds

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (accessToken) {
        try {
          const data = await getMintPageData(accessToken);
          setMintData(data);
        } catch (err) {
          if (err instanceof Error) {
            setError(err);
          } else {
            setError(new Error("An unexpected error occurred."));
          }
        } finally {
          setLoading(false);
        }
      } else if (!waitForToken) {
        setError(new Error("Access token is required."));
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken, waitForToken]);

  const handleCheckout = () => {
    const itemsString = localStorage.getItem("swop_desktop_cart_item_list");
    if (!itemsString) {
      alert("No items in the cart.");
      return;
    }

    try {
      const items = JSON.parse(itemsString);
      const encodedItems = encodeURIComponent(JSON.stringify(items));
      const url = `http://localhost:3001/GetClient?items=${encodedItems}`;
      window.location.href = url;
    } catch (err) {
      console.error("Error parsing cart items:", err);
      alert("Failed to process cart items.");
    }
  };

  if (loading) {
    return <HomePageLoading />;
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }

  if (!mintData || ("noCollections" in mintData && mintData.noCollections)) {
    const staticSamples = nftTypes.map((nftType) => ({
      nftType,
      templates: [
        {
          templateId: `${nftType}-sample`,
          metadata: {
            image: `https://cdn-icons-png.freepik.com/512/16982/16982993.png`, // Replace with your sample images
            name: `${capitalizeFirstLetter(nftType)} Sample`,
          },
          supply: {
            limit: 100,
            minted: 0,
          },
        },
      ],
    }));
  
    return (
      <main className="main-container">
        <div className="bg-white p-4">
          <h2 className="text-center text-2xl font-bold mb-6">
            Explore NFT Types
          </h2>
          {staticSamples.map((sampleGroup) => (
            <div key={sampleGroup.nftType}>
              <h3 className="text-xl font-semibold mb-2">
                {capitalizeFirstLetter(sampleGroup.nftType)}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 xl:gap-10">
                {sampleGroup.templates.map((template) => (
                  <MintCart
                    key={template.templateId}
                    img={template.metadata.image}
                    title={template.metadata.name}
                    text={`Limit: ${template.supply.limit}, Minted: ${template.supply.minted}`}
                    collectionId="static-sample"
                    templateId={template.templateId}
                  />
                ))}
                <div
                  className="min-h-[360px] min-w-[365px] h-full w-full"
                  onClick={() =>
                    (window.location.href = `/mint/create${capitalizeFirstLetter(
                      sampleGroup.nftType
                    )}`)
                  }
                >
                  <SaveToLocalAndNavigate collectionId="static-sample" />
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-center mt-8">
            <Link href="/mint/createCollection">
              <PushToMintCollectionButton className="!py-2">
                Create Collection
              </PushToMintCollectionButton>
            </Link>
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="main-container">
      <div className="bg-white p-4">
        {mintData &&
          "data" in mintData &&
          Array.isArray(mintData.data) &&
          mintData.data.map((group) => (
            <div key={group.collection.id}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold mb-4">
                  {group.collection.metadata.name}
                </h2>
                <button
                  onClick={handleCheckout}
                  className="ml-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Go for Checkout
                </button>
              </div>
              {nftTypes.map((nftType) => (
                <div key={nftType}>
                  <h3 className="text-xl font-semibold mb-2">
                    {capitalizeFirstLetter(nftType)}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 xl:gap-10">
                    {group.templatesByNftType[nftType]?.length
                      ? group.templatesByNftType[nftType].map((template) => (
                          <MintCart
                            key={template.templateId}
                            img={template.metadata.image}
                            title={template.metadata.name}
                            text={`Limit: ${template.supply.limit}, Minted: ${template.supply.minted}`}
                            collectionId={group.collection.id}
                            templateId={template.templateId}
                          />
                        ))
                      : null}
                    <div
                      className="min-h-[360px] min-w-[365px] h-full w-full"
                      onClick={() =>
                        (window.location.href = `/mint/create${capitalizeFirstLetter(
                          nftType
                        )}`)
                      }
                    >
                      <SaveToLocalAndNavigate
                        collectionId={group.collection.id}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

        <div className="flex justify-center mt-8">
          <Link href="/mint/createCollection">
            <PushToMintCollectionButton className="!py-2">
              Create Collection
            </PushToMintCollectionButton>
          </Link>
        </div>
      </div>
    </main>
  );
};

export default MintDashboard;
