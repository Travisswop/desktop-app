"use client";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { useState, ChangeEvent } from "react";

type TokenType = "NFT" | "Token";

const TokenGatedContent = () => {
  const [isOn, setIsOn] = useState<boolean>(true);
  const [tokenType, setTokenType] = useState<TokenType>("NFT");
  const [selectedToken, setSelectedToken] = useState<string>("Rakibs Big Mac");
  const [forwardLink, setForwardLink] = useState<string>("");
  const [minRequired, setMinRequired] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string | null>(null);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-white max-w-4xl rounded-2xl mx-auto p-8 flex items-center justify-center">
      <div className="w-full">
        <h1 className="text-2xl font-semibold text-center mb-12">
          Token Powered Site
        </h1>

        <div className="space-y-8">
          {/* On/Off and Token Type Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* On/Off */}
            <div>
              <label className="block text-sm font-medium mb-3">On/Off:</label>
              <div className="bg-white rounded-full p-1 flex shadow-medium shadow-white">
                <button
                  onClick={() => setIsOn(true)}
                  className={`flex-1 py-2.5 rounded-full font-medium transition-all duration-400 ${
                    isOn
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  On
                </button>
                <button
                  onClick={() => setIsOn(false)}
                  className={`flex-1 py-2.5 rounded-full font-medium transition-all duration-400 ${
                    !isOn
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Token Type */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Token Type:
              </label>
              <div className="bg-white rounded-full p-1 flex shadow-medium">
                <button
                  onClick={() => setTokenType("NFT")}
                  className={`flex-1 py-2.5 rounded-full font-medium transition-all duration-400 ${
                    tokenType === "NFT"
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  NFT
                </button>
                <button
                  onClick={() => setTokenType("Token")}
                  className={`flex-1 py-2.5 rounded-full font-medium transition-all duration-400 ${
                    tokenType === "Token"
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Token
                </button>
              </div>
            </div>
          </div>

          {/* Select Token and Forward Link Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Select Token */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Select Token:
              </label>
              <div className="relative">
                <select
                  value={selectedToken}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setSelectedToken(e.target.value)
                  }
                  className="w-full px-4 py-3 bg-white rounded-xl shadow-medium appearance-none cursor-pointer focus:outline-none"
                >
                  <option value="Rakibs Big Mac">Rakibs Big Mac</option>
                  <option value="Token 2">Token 2</option>
                  <option value="Token 3">Token 3</option>
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={20}
                />
              </div>
              <p className="text-red-600 text-sm mt-2">
                *You have no nfts or tokens.
              </p>
            </div>

            {/* Forward Link */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Forward Link:
              </label>
              <input
                type="text"
                value={forwardLink}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setForwardLink(e.target.value)
                }
                className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none shadow-medium"
                placeholder=""
              />
            </div>
          </div>

          {/* Min Required */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Min Required:
            </label>
            <input
              type="text"
              value={minRequired}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setMinRequired(e.target.value)
              }
              className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none shadow-medium"
              placeholder=""
            />
          </div>

          {/* Upload Cover Image */}
          <div className="bg-white rounded-2xl p-8 shadow-medium">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                {coverImage ? (
                  <Image
                    src={coverImage}
                    alt="Cover"
                    width={320}
                    height={320}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <svg
                    className="w-12 h-12 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="8.5"
                      cy="8.5"
                      r="1.5"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="21 15 16 10 5 21"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <span className="inline-block px-8 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                  Upload Cover Image
                </span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <button className="w-full py-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-lg transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenGatedContent;
