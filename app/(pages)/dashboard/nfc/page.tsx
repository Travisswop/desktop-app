"use client";

import { X } from "lucide-react";

// Types
interface NFCCard {
  id: string;
  url: string;
}

interface CreateNFCPageProps {
  onClose?: () => void;
  cards?: NFCCard[];
  onCardClick?: (card: NFCCard) => void;
}

// Simple NFC Card Component - matches exact design
const NFCCardItem = ({
  card,
  onClick,
}: {
  card: NFCCard;
  onClick?: () => void;
}) => {
  return (
    <div
      className="bg-white rounded-lg shadow-small p-6 hover:shadow-medium transition-all cursor-pointer"
      onClick={() => onClick?.(card)}
    >
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{card.id}</h3>
      <p className="text-xs text-gray-500 truncate">{card.url}</p>
    </div>
  );
};

// Main Create NFC Page Component
export default function CreateNFCPage({
  onClose,
  cards,
  onCardClick,
}: CreateNFCPageProps) {
  // Default sample data matching the image
  const defaultCards: NFCCard[] = [
    { id: "0f46b98-1001", url: "https://www.youtube.com/" },
    { id: "0f46b98-1002", url: "https://www.youtube.com/" },
    { id: "0f46b98-1003", url: "https://www.youtube.com/" },
    { id: "0f46b98-1004", url: "https://www.youtube.com/" },
    { id: "0f46b98-1005", url: "https://www.youtube.com/" },
    { id: "0f46b98-1006", url: "https://www.youtube.com/" },
    { id: "0f46b98-1007", url: "https://www.youtube.com/" },
    { id: "0f46b98-1008", url: "https://www.youtube.com/" },
    { id: "0f46b98-1009", url: "https://www.youtube.com/" },
    { id: "0f46b98-1010", url: "https://www.youtube.com/" },
    { id: "0f46b98-1011", url: "https://www.youtube.com/" },
    { id: "0f46b98-1012", url: "https://www.youtube.com/" },
    { id: "0f46b98-1013", url: "https://www.youtube.com/" },
    { id: "0f46b98-1014", url: "https://www.youtube.com/" },
    { id: "0f46b98-1015", url: "https://www.youtube.com/" },
  ];

  const displayCards = cards || defaultCards;

  return (
    <div className="bg-white p-5 rounded-xl">
      <h1 className="text-lg font-medium text-gray-900 mb-2">Create NFC</h1>

      {/* Content */}
      <div className="">
        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayCards.map((card) => (
            <NFCCardItem key={card.id} card={card} onClick={onCardClick} />
          ))}
        </div>

        {/* Empty State */}
        {displayCards.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No NFC cards available</p>
          </div>
        )}
      </div>
    </div>
  );
}
