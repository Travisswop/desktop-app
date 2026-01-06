"use client";
import Image from "next/image";
import ensImg from "@/public/images/ens.png";
import { useUser } from "@/lib/UserContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { usePrivy, useSolanaWallets, useWallets } from "@privy-io/react-auth";
import { Download, Share2 } from "lucide-react";

const GetQrCodeUsingWalletAddress = ({
  walletName,
}: {
  walletName: "sol" | "eth" | "pol" | "base";
}) => {
  const { user } = useUser();
  const { user: privyUser } = usePrivy();
  const qrRef = useRef<HTMLDivElement>(null);
  const [qrOpenStatus, setQrOpenStatus] = useState<
    boolean | "sol" | "eth" | "pol" | "base"
  >(false);

  console.log("qrOpenStatus", qrOpenStatus);

  useEffect(() => {
    if (walletName) {
      setQrOpenStatus(walletName);
    }
  }, [walletName]);

  const { wallets: solWallets } = useSolanaWallets();
  const { wallets: ethWallets } = useWallets();

  const solWalletAddress = useMemo(() => {
    return solWallets?.find(
      (w) => w.walletClientType === "privy" || w.connectorType === "embedded"
    )?.address;
  }, [solWallets]);

  const evmWalletAddress = useMemo(() => {
    return ethWallets?.find(
      (w) => w.walletClientType === "privy" || w.connectorType === "embedded"
    )?.address;
  }, [ethWallets]);

  const chainAddresses = [
    {
      name: "Solana",
      icon: "/assets/icons/SOL.png",
      address: solWalletAddress,
    },
    {
      name: "Ethereum",
      icon: "/assets/icons/ETH.png",
      address: evmWalletAddress,
    },
    {
      name: "Polygon",
      icon: "/assets/icons/POL.png",
      address: evmWalletAddress,
    },
    {
      name: "Base",
      icon: "/assets/icons/base.png",
      address: evmWalletAddress,
    },
  ];

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

  //   const solanaWalletAddress = "wwererdddsdfdf";

  const handleShareQR = async () => {
    if (!evmWalletAddress || !solWalletAddress) return;

    const shareData = {
      title: `My Wallet Address`,
      text: `My Wallet Address: ${
        qrOpenStatus === "eth" ||
        qrOpenStatus === "pol" ||
        qrOpenStatus === "base"
          ? evmWalletAddress
          : solWalletAddress
      }`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          qrOpenStatus === "eth" ||
            qrOpenStatus === "pol" ||
            qrOpenStatus === "base"
            ? evmWalletAddress
            : solWalletAddress
        );
        alert("Address copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <div className="relative bg-white mx-auto p-8">
      <div className="">
        <div className="flex items-center mb-5 justify-center">
          <div className="w-12 h-12 flex items-center justify-center">
            <Image src={ensImg} alt="ens image" />
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
                value={
                  qrOpenStatus === "eth" ||
                  qrOpenStatus === "pol" ||
                  qrOpenStatus === "base"
                    ? evmWalletAddress || ""
                    : solWalletAddress || ""
                }
                size={200}
                level="H"
                includeMargin={false}
                //need to use local image
                imageSettings={{
                  src:
                    qrOpenStatus === "sol"
                      ? chainAddresses[0].icon
                      : qrOpenStatus === "eth"
                      ? chainAddresses[1].icon
                      : qrOpenStatus === "base"
                      ? chainAddresses[3].icon
                      : chainAddresses[2].icon,
                  height: 40,
                  width: 40,
                  excavate: true, // ensures clear background behind logo
                }}
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
          {`Use This Only To Receive Tokens or NFTs on the ${
            qrOpenStatus === "sol"
              ? "Solana"
              : qrOpenStatus === "eth"
              ? "Etherium"
              : qrOpenStatus === "pol"
              ? "Polygon"
              : "Base"
          } Blockchain`}
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
  );
};

export default GetQrCodeUsingWalletAddress;
