"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import MintCart from "@/components/MintCart";
import Link from "next/link";
import PushToMintCollectionButton from "@/components/Button/PushToMintCollectionButton";
import SaveToLocalAndNavigate from "@/components/SaveToLocalAndNavigate";
// import { useUser } from "@/lib/UserContext";
import HomePageLoading from "@/components/loading/HomePageLoading";
import getMintPageData, { GroupedTemplates } from "@/utils/fetchingData/getMintPageData";


const MintDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const [mintData, setMintData] = useState<
    { data: GroupedTemplates[] } | { noCollections: boolean } | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // const { user, loading, error } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const demoAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjM4NjMyMDIzMDQxMDMyODAyOTk4MmIiLCJpYXQiOjE3MjcxNTI4MzB9.CsHnZAgUzsfkc_g_CZZyQMXc02Ko_LhnQcCVpeCwroY";
        const data = await getMintPageData(demoAccessToken);
        setMintData(data);
      } catch (err) {
        setError(err as Error); // Type assertion here
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);
  

  if (loading) {
    return <HomePageLoading />;
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }

  if (!mintData || ('noCollections' in mintData && mintData.noCollections)) {
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
  // console.log("user", user);

  const handleSaveClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleConfirmClick = () => {
    if (selectedOption === "Collectible") {
      window.location.href = "/mint/createCollectible";
    } else if (selectedOption === "Coupon") {
      window.location.href = "/mint/createCoupon";
    } else if (selectedOption === "Subscription") {
      window.location.href = "/mint/createSubscription";
    } else if (selectedOption === "Membership") {
      window.location.href = "/mint/createMembership";
    } else if (selectedOption === "Menu Item") {
      window.location.href = "/mint/createMenuItem";
    } else if (selectedOption === "Phygital") {
      window.location.href = "/mint/createPhygital";
    }
  };

  const handleOptionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(event.target.value);
  };

  return (
    <main className="main-container">
      <div className="bg-white p-4">
        {/* Render collections dynamically */}
        {mintData && 'data' in mintData && Array.isArray(mintData.data) && mintData.data.map((group) => (
          <div key={group.collection.id}>
            <h2 className="text-2xl font-bold mb-4">
              {group.collection.metadata.name}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 xl:gap-10">
              {group.templates.map((template) => (
                <MintCart
                  key={template.templateId}
                  img={template.metadata.image}
                  title={template.metadata.name}
                  text={`Limit: ${template.supply.limit}, Minted: ${template.supply.minted}`}
                  collectionId={group.collection.id}
                  templateId={template.templateId}
                />
              ))}

              <div className="h-full w-full" onClick={handleSaveClick}>
                <SaveToLocalAndNavigate collectionId="collection-id" />
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

        {isModalOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
            onClick={handleModalClose}
          >
            <div
              className="bg-white p-6 rounded-lg w-1/3"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Select Type</h3>
              <select
                value={selectedOption}
                onChange={handleOptionChange}
                className="w-full mb-4 border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="" disabled>Select an option</option>
                <option value="Collectible">Collectible</option>
                <option value="Subscription">Subscription</option>
                <option value="Membership">Membership</option>
                <option value="Coupon">Coupon</option>
                <option value="Menu Item">Menu Item</option>
                <option value="Phygital">Phygital</option>
              </select>
              <button
                onClick={handleConfirmClick}
                className="w-full bg-black text-white px-4 py-2 rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default MintDashboard;
