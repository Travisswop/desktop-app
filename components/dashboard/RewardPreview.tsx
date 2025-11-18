"use client";
import React, { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { PrimaryButton } from "../ui/Button/PrimaryButton";
import Image from "next/image";
import swopRewards from "@/public/assets/images/swop-rewards.png";
import { useUser } from "@/lib/UserContext";
import { FaGift } from "react-icons/fa";

const RewardsCardPreview: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [points, setPoints] = useState(0);
  const { user } = useUser();

  useEffect(() => {
    const fetchSwopplePoints = async () => {
      try {
        // setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/points/user/point/${user?._id}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        const result = await response.json();
        setPoints(result.availablePoints);
      } catch (err: any) {
        console.error(err.message);
      }
    };
    if (user?._id) {
      fetchSwopplePoints();
    }
  }, [user?._id]);

  console.log("hola user", user);

  const referralCode = "5eyQ0_kmv";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Rewards</h2>
          <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center">
            <span className="text-xs text-gray-400">i</span>
          </div>
        </div>
        <PrimaryButton className="text-sm">View</PrimaryButton>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {/* Content Container */}
        <div className="flex items-start gap-6 w-full sm:w-[46%] 2xl:w-[50%]">
          <div className="w-[80%] lg:w-[90%] 2xl:w-[70%] mx-auto">
            <Image src={swopRewards} alt="swop rewards" />
            {/* Balance Display */}
            <div className="">
              <div className="text-2xl font-bold text-gray-900 mt-2">
                <p className="flex items-center gap-1 justify-center">
                  <FaGift />
                  {points}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Code Section */}
        <div className="space-y-6 w-full sm:w-[54%] 2xl:w-[50%]">
          {/* Text Content */}
          <div className="flex-1 pt-2">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Share unique code with Friends
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              When your friend buys a product using it, you earn money. The more
              you share, the more you earn.
            </p>
          </div>
          <div className="flex items-center justify-between shadow-md p-2 px-3 rounded-lg">
            <div>
              <span className="text-sm font-bold text-gray-800">
                Referral Code
              </span>
              <p className="text-sm text-gray-500">{user?.referralCode}</p>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          {/* Payment Dashboard Button */}
          <PrimaryButton className="w-full py-2">
            Payment Dashboard
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default RewardsCardPreview;
