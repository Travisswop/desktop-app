"use client";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { BsBank } from "react-icons/bs";
import CustomModal from "../modal/CustomModal";
import { useSolanaWallets, useFundWallet } from "@privy-io/react-auth/solana";
import Image from "next/image";
import coinbaseImg from "@/public/images/coinbase.png";
import bridgeImg from "@/public/images/bridge.png";

export default function WalletFundandSettingsPopup() {
  const [isFundWalletOpen, setIsFundWalletOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { fundWallet } = useFundWallet();
  const { wallets: solanaWallets } = useSolanaWallets();
  const solanaWalletAddress = solanaWallets?.[0]?.address;
  const handleCoinbaseClick = async () => {
    if (!solanaWalletAddress) {
      console.error("No wallet address available");
      return;
    }

    setIsLoading(true);
    try {
      await fundWallet({
        address: solanaWalletAddress,
        asset: "USDC",
        amount: "20",
      });
    } catch (error) {
      console.error("Failed to open Coinbase funding:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <section className="p-4 space-y-3">
      <button
        onClick={() => setIsFundWalletOpen(true)}
        className="flex w-full text-start items-center gap-4 p-3 rounded-xl shadow-medium hover:bg-gray-50 cursor-pointer transition border"
      >
        <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
          <Wallet className="w-5 h-5 text-gray-700" />
        </div>
        <div>
          <p className="text-base font-medium text-gray-900">Fund</p>
          <p className="text-sm text-gray-500">Fund Your Wallet</p>
        </div>
      </button>

      <a
        href="https://www.swopme.co/support"
        target="_blank"
        className="flex items-center gap-4 p-3 rounded-xl shadow-medium hover:bg-gray-50 cursor-pointer transition border"
      >
        <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
          <BsBank className="w-5 h-5 text-gray-700" />
        </div>
        <div>
          <p className="text-base font-medium text-gray-900">Settings</p>
          <p className="text-sm text-gray-500">Open Wallet Settings</p>
        </div>
      </a>

      {isFundWalletOpen && (
        <CustomModal
          isOpen={isFundWalletOpen}
          onCloseModal={setIsFundWalletOpen}
        >
          <div className="relative bg-white rounded-2xl w-full mx-auto p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold">Buy Crypto</h2>
            </div>

            <div className="space-y-6">
              <div className="border p-6 rounded-2xl">
                <h3 className="text-lg font-semibold mb-2 text-center">
                  Add founds
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  Select a method for funding your Swop wallet.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleCoinbaseClick}
                    disabled={isLoading || !solanaWalletAddress}
                    className="w-full border-2 border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                      <Image src={coinbaseImg} alt="coinbase" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Coinbase</span>
                      </div>
                    </div>
                  </button>

                  <button
                    // onClick={handleBridgeClick}
                    disabled={isLoading}
                    className="w-full border-2 border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                      <Image src={bridgeImg} alt="bridge" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Bridge</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="text-center pt-4">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                  Protected by
                  <span className="font-semibold text-gray-700">privy</span>
                </p>
              </div>
            </div>
          </div>
        </CustomModal>
      )}
    </section>
  );
}
