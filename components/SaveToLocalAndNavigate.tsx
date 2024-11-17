"use client"; // Ensures this is a client-side component

import React from "react";

interface SaveToLocalAndNavigateProps {
  collectionId: string;
}

const SaveToLocalAndNavigate: React.FC<SaveToLocalAndNavigateProps> = ({ collectionId }) => {

  const handleClick = () => {
    // Save the collectionId to localStorage
    localStorage.setItem("swop_desktop_collectionId_for_createTemplate", collectionId);

    // Navigate using window.location.href
    window.location.href = "/mint/createTemplate";
  };

  return (
    <button
      className="px-4 py-2 text-sm font-medium border border-gray-400 rounded-lg"
      onClick={handleClick}
    >
      Add NFTs To This Collection
    </button>
  );
};

export default SaveToLocalAndNavigate;
