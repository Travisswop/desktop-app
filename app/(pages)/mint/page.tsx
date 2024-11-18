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
          <h2 className="text-2xl font-bold mb-4">Collection Name</h2>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 xl:gap-10 2xl:gap-16">
            <MintCart
              key="template-id"
              img="/path/to/image.jpg"
              title="Template Name"
              text="Limit: X, Minted: Y"
              collectionId="collection-id"
              templateId="template-id"
            />
            <SaveToLocalAndNavigate collectionId="collection-id" />
          </div>
        </div>

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
