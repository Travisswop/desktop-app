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

  if (loading) {
    return <HomePageLoading />;
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }

  if (!mintData || ("noCollections" in mintData && mintData.noCollections)) {
    return (
      <main className="main-container">
        <div className="bg-white p-4 text-center">
          <h4>No collections found.</h4>
          <Link href="/mint/createCollection">
            <PushToMintCollectionButton className="!py-2">
              Create Collection
            </PushToMintCollectionButton>
          </Link>
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
              <h2 className="text-2xl font-bold mb-4">
                {group.collection.metadata.name}
              </h2>
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
                        window.location.href = `/mint/create${capitalizeFirstLetter(
                          nftType
                        )}`
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
