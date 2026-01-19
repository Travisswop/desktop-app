"use client";

import {
  ShoppingCart,
  Key,
  Settings,
  CreditCard,
  AlertTriangle,
  X,
  Download,
  Share2,
} from "lucide-react";
import {
  RiShieldKeyholeLine,
  RiRobot2Line,
  RiSmartphoneLine,
} from "react-icons/ri";
import { useMfaEnrollment, usePrivy } from "@privy-io/react-auth";
import { useState, useRef } from "react";
import CustomModal from "@/components/modal/CustomModal";
import { SiEthereum, SiSolana } from "react-icons/si";
import {
  useWallets as useSolanaWallets,
  useFundWallet,
  useExportWallet as useSolanaExportWallet,
} from "@privy-io/react-auth/solana";
import coinbaseImg from "@/public/images/coinbase.png";
import bridgeImg from "@/public/images/bridge.png";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useUser } from "@/lib/UserContext";

export default function WalletSetting() {
  const { showMfaEnrollmentModal } = useMfaEnrollment();
  const { user } = useUser();
  console.log(user);

  const [openKeysModal, setOpenKeysModal] = useState(false);
  const [openBuyCryptoModal, setOpenBuyCryptoModal] = useState(false);
  const [openSwopIdModal, setOpenSwopIdModal] = useState(false);
  const { exportWallet, user: privyUser } = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { exportWallet: exportSolanaWallet } = useSolanaExportWallet();
  const { fundWallet } = useFundWallet();
  const [isLoading, setIsLoading] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Check for wallets
  const hasEVMWallet = !!privyUser?.linkedAccounts.find(
    (account) =>
      account.type === "wallet" &&
      account.walletClientType === "privy" &&
      account.chainType === "ethereum"
  );

  const hasSolanaWallet = !!privyUser?.linkedAccounts.find(
    (account) =>
      account.type === "wallet" &&
      account.walletClientType === "privy" &&
      account.chainType === "solana"
  );

  // Get Solana wallet address
  const solanaWalletAddress = solanaWallets?.[0]?.address;

  const handleExportEVM = async () => {
    try {
      await exportWallet();
      setOpenKeysModal(false);
    } catch (error) {
      console.error("Failed to export EVM wallet:", error);
    }
  };

  const handleExportSolana = async () => {
    try {
      await exportSolanaWallet();
      setOpenKeysModal(false);
    } catch (error) {
      console.error("Failed to export Solana wallet:", error);
    }
  };

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

  const handleBridgeClick = () => {
    // Implement Bridge functionality
    console.log("Bridge clicked");
  };

  const handleSaveQR = async () => {
    if (!qrRef.current) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(qrRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const link = document.createElement("a");
      link.download = `swop-qr-${
        privyUser?.email?.address?.split("@")[0] || "user"
      }.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Error saving QR code:", error);
    }
  };

  const handleShareQR = async () => {
    if (!solanaWalletAddress) return;

    const shareData = {
      title: "My Solana Address",
      text: `My Solana Address: ${solanaWalletAddress}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(solanaWalletAddress);
        alert("Address copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const username =
    privyUser?.email?.address?.split("@")[0] ||
    privyUser?.phone?.number ||
    "User";

  return (
    <div className="">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <h1 className="text-center text-xl font-semibold mb-8">
          Wallet Settings
        </h1>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* 2FA */}
          <button
            onClick={showMfaEnrollmentModal}
            className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          >
            <div className="mb-3">
              <RiShieldKeyholeLine size={48} />
            </div>
            <span className="text-sm font-medium">2FA</span>
          </button>

          {/* Keys */}
          <button
            onClick={() => setOpenKeysModal(true)}
            className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          >
            <div className="mb-3">
              <Key size={48} />
            </div>
            <span className="text-sm font-medium">Keys</span>
          </button>

          {/* DApps */}
          <button
            disabled
            className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          >
            <div className="mb-3">
              <RiRobot2Line size={48} />
            </div>
            <span className="text-sm font-medium">DApps</span>
          </button>

          {/* Buy Crypto */}
          <button
            onClick={() => setOpenBuyCryptoModal(true)}
            className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          >
            <div className="mb-3">
              <ShoppingCart size={48} />
            </div>
            <span className="text-sm font-medium">Buy Crypto</span>
          </button>

          {/* Swop ID */}
          <button
            onClick={() => setOpenSwopIdModal(true)}
            className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          >
            <div className="mb-3">
              <RiSmartphoneLine size={48} />
            </div>
            <span className="text-sm font-medium">Swop ID</span>
          </button>

          {/* Debit Card */}
          <button
            disabled
            className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          >
            <div className="mb-3">
              <CreditCard size={48} />
            </div>
            <span className="text-sm font-medium">Debit Card</span>
          </button>

          {/* Support */}
          <a
            href="https://www.swopme.co/support"
            target="_blank"
            className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          >
            <div className="mb-3">
              <Settings size={48} />
            </div>
            <span className="text-sm font-medium">Support</span>
          </a>
        </div>
      </div>

      {/* Keys Modal */}
      {openKeysModal && (
        <CustomModal isOpen={openKeysModal} onCloseModal={setOpenKeysModal}>
          <div className="p-6 max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
                <Key className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Export Wallet Keys</h2>
              <p className="text-gray-600 text-sm">
                Select which wallet you want to view or export
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900 mb-1">
                  Keep your keys secure
                </p>
                <p className="text-amber-700">
                  Never share your private keys with anyone. Anyone with access
                  to your keys can access your funds.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleExportEVM}
                disabled={!hasEVMWallet}
                className={`w-full border-2 rounded-xl p-5 flex items-center gap-4 transition-all ${
                  hasEVMWallet
                    ? "border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
                    : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"
                }`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <SiEthereum className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-lg">EVM Wallet</h3>
                  <p className="text-sm text-gray-600">
                    Ethereum, Polygon, BSC, and more
                  </p>
                </div>
                {!hasEVMWallet && (
                  <span className="text-xs bg-gray-200 px-3 py-1 rounded-full text-gray-600">
                    Not Available
                  </span>
                )}
              </button>

              <button
                onClick={handleExportSolana}
                disabled={!hasSolanaWallet}
                className={`w-full border-2 rounded-xl p-5 flex items-center gap-4 transition-all ${
                  hasSolanaWallet
                    ? "border-gray-200 hover:border-purple-500 hover:bg-purple-50 cursor-pointer"
                    : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"
                }`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <SiSolana className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-lg">Solana Wallet</h3>
                  <p className="text-sm text-gray-600">
                    Solana blockchain network
                  </p>
                </div>
                {!hasSolanaWallet && (
                  <span className="text-xs bg-gray-200 px-3 py-1 rounded-full text-gray-600">
                    Not Available
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => setOpenKeysModal(false)}
              className="w-full mt-6 py-3 text-gray-700 font-medium bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </CustomModal>
      )}

      {/* Buy Crypto Modal */}
      {openBuyCryptoModal && (
        <CustomModal
          isOpen={openBuyCryptoModal}
          onCloseModal={setOpenBuyCryptoModal}
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
                    onClick={handleBridgeClick}
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

      {/* Swop ID Modal */}
      {openSwopIdModal && (
        <CustomModal
          isOpen={openSwopIdModal}
          onCloseModal={() => setOpenSwopIdModal(false)}
          width="max-w-md"
        >
          <div className="relative bg-white mx-auto p-8">
            <div className="">
              <div className="flex items-center mb-5 justify-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                  <span className="text-white text-xl font-semibold">
                    {username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {user && (user.ens || user.ensName)}
                </h2>
              </div>

              <div className="flex flex-col items-center mb-6">
                <div
                  ref={qrRef}
                  className="border-2 border-gray-900 rounded-2xl p-2 bg-white inline-block"
                >
                  <div className="bg-white p-4">
                    <QRCodeSVG
                      value={solanaWalletAddress || "No address available"}
                      size={200}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      Powered By Swop
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-center text-gray-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                Use This Only To Receive Tokens or NFTs on the Solana Blockchain
              </p>

              <div className="flex justify-center gap-4">
                <button
                  onClick={handleSaveQR}
                  className="bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <Download size={20} />
                  Save
                </button>
                <button
                  onClick={handleShareQR}
                  className="bg-gray-100 text-gray-900 px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Share2 size={20} />
                  Share
                </button>
              </div>
            </div>
          </div>
        </CustomModal>
      )}
    </div>
  );
}
