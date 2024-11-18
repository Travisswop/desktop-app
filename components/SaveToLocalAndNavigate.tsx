"use client"; // Ensures this is a client-side component

import React from "react";
import { PlusCircle } from "lucide-react";

interface SaveToLocalAndNavigateProps {
  collectionId: string;
}

const SaveToLocalAndNavigate: React.FC<SaveToLocalAndNavigateProps> = ({ collectionId }) => {

  const handleClick = () => {
    // Save the collectionId to localStorage
    localStorage.setItem("swop_desktop_collectionId_for_createTemplate", collectionId);
  };

  return (
    <div
      className="shadow-medium rounded-lg px-5 py-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 h-full w-full"
      onClick={handleClick}
    >
      <PlusCircle className="w-24 h-24 text-gray-500 mb-4" />
      <p className="text-lg font-semibold text-gray-700">Add NFTs To This Collection</p>
    </div>
  );
};

export default SaveToLocalAndNavigate;
