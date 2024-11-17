import React from "react";
import MintCart from "@/components/MintCart";
import Link from "next/link";
import PushToMintCollectionButton from "@/components/Button/PushToMintCollectionButton";
import SaveToLocalAndNavigate from "@/components/SaveToLocalAndNavigate";

const MintDashboard = () => {
  return (
    <main className="main-container">
      <div className="bg-white p-4">
        {/* Render collections dynamically */}
        <div>
          <h6 className="heading-4 mb-4">Collection Name</h6>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 xl:gap-10 2xl:gap-16">
            <MintCart
              key="template-id"
              img="/path/to/image.jpg"
              title="Template Name"
              text="Limit: X, Minted: Y"
              collectionId="collection-id"
              templateId="template-id"
            />
          </div>

          {/* Use the new client-side component for handling localStorage and navigation */}
          <div className="flex justify-center my-6">
            <SaveToLocalAndNavigate collectionId="collection-id" />
          </div>
        </div>

        <div className="flex justify-center">
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
