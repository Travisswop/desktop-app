"use client";
import {
  Check,
  Copy,
  Download,
  QrCodeIcon,
  Share2,
  Wallet,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { BsBank } from "react-icons/bs";
import ensImg from "@/public/images/ens.png";
import Image from "next/image";
import { PrimaryButton } from "../ui/Button/PrimaryButton";
import { FaArrowLeftLong } from "react-icons/fa6";
import { MdOutlineQrCodeScanner } from "react-icons/md";
import { IoCopyOutline } from "react-icons/io5";
import { QRCodeSVG } from "qrcode.react";
import { useUser } from "@/lib/UserContext";
import { usePrivy, useSolanaWallets, useWallets } from "@privy-io/react-auth";

export default function ReceiveOptions() {
  const [navigateCryptoFiat, setNavigateCryptoFiat] = useState({
    crypto: false,
    fiat: false,
  });

  const [qrOpenStatus, setQrOpenStatus] = useState<boolean | "sol" | "eth">(
    false
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const qrRef = useRef<HTMLDivElement>(null);

  const { user: privyUser } = usePrivy();
  const { user } = useUser();

  console.log("user", user);

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

  console.log("solWallets", solWalletAddress);
  console.log("ethWallets", evmWalletAddress);

  const handleCopy = (address: string, index: number) => {
    navigator.clipboard.writeText(address);
    setCopiedIndex(index);

    setTimeout(() => {
      setCopiedIndex(null);
    }, 1200); // 1.2 sec highlight
  };

  const chainAddresses = [
    {
      name: "Solana",
      icon: "https://app.apiswop.co/public/crypto-icons/SOL.png",
      address: solWalletAddress,
    },
    {
      name: "Ethereum",
      icon: "https://app.apiswop.co/public/crypto-icons/ETH.png",
      address: evmWalletAddress,
    },
    {
      name: "Polygon",
      icon: "https://app.apiswop.co/public/crypto-icons/POL.png",
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
        qrOpenStatus === "eth" ? evmWalletAddress : solWalletAddress
      }`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          qrOpenStatus === "eth" ? evmWalletAddress : solWalletAddress
        );
        alert("Address copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleBackBtn = () => {
    if (qrOpenStatus) {
      setQrOpenStatus(false);
    } else {
      setNavigateCryptoFiat({ crypto: false, fiat: false });
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl ${
        !navigateCryptoFiat.crypto && "p-4 px-6"
      } space-y-4 shadow-sm`}
    >
      {(navigateCryptoFiat.crypto || navigateCryptoFiat.fiat) && (
        <button onClick={handleBackBtn} className="absolute left-3 top-3">
          <FaArrowLeftLong />
        </button>
      )}

      {qrOpenStatus ? (
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
                  {/* <QRCodeSVG
                    value={
                      qrOpenStatus === "eth"
                        ? evmWalletAddress || ""
                        : solWalletAddress || ""
                    }
                    //   value={solanaWalletAddress || "No address available"}
                    size={200}
                    level="H"
                    includeMargin={false}
                  /> */}

                  <QRCodeSVG
                    value={
                      qrOpenStatus === "eth"
                        ? evmWalletAddress || ""
                        : solWalletAddress || ""
                    }
                    size={200}
                    level="H"
                    includeMargin={false}

                    //need to use local image
                    // imageSettings={{
                    //   src:
                    //     qrOpenStatus === "sol"
                    //       ? "https://upload.wikimedia.org/wikipedia/commons/6/6f/Ethereum-icon-purple.svg"
                    //       : chainAddresses[1].icon,
                    //   height: 40,
                    //   width: 40,
                    //   excavate: true, // ensures clear background behind logo
                    // }}
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
                qrOpenStatus === "sol" ? "Solana" : "Etherium"
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
      ) : (
        <>
          {/* ---------- SHOW CRYPTO UI ---------- */}
          {navigateCryptoFiat.crypto && (
            <div className="w-full p-6 space-y-6">
              <div className="space-y-3 shadow-medium rounded-xl p-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 flex items-center justify-center">
                    <Image src={ensImg} alt="ens image" />
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      Laiba1.Swop.Id
                    </p>
                  </div>
                </div>

                <div className="text-start space-y-3 text-gray-500">
                  <p className="text-sm leading-relaxed">
                    Your swop.id is your universal identity for messaging,
                    payments, and publishing.
                  </p>
                  <p className="text-sm leading-relaxed">It gives you:</p>
                  <div className="text-left text-sm space-y-1 px-2">
                    <p>
                      • One link to receive encrypted messages, post updates,
                      and interact with bots.
                    </p>
                    <p>
                      • One address to receive stablecoin payments instantly.
                    </p>
                    <p>
                      • One profile where your content, feed, and assets live —
                      always on-chain, always yours.
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed">
                    Share your swop.id to stay connected, get paid, and grow
                    your presence in one place.
                  </p>
                </div>

                <div className="text-center">
                  <PrimaryButton className="w-full py-2">
                    Share your username
                  </PrimaryButton>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {chainAddresses.map((chain, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center shadow-medium rounded-xl p-4 space-y-2"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {chain.name}
                    </p>

                    <div className="w-10 h-10 rounded-full flex items-center justify-center">
                      <Image
                        src={chain.icon}
                        alt={chain.name}
                        width={120}
                        height={120}
                      />
                    </div>

                    <p className="text-xs text-gray-600 font-mono">
                      {chain.address
                        ? `${chain.address.slice(0, 4)}...${chain.address.slice(
                            -4
                          )}`
                        : ""}
                    </p>

                    <div className="flex gap-1 mt-2">
                      {/* Copy Button */}
                      <button
                        onClick={() =>
                          setQrOpenStatus(
                            chain.name?.toUpperCase() === "SOLANA"
                              ? "sol"
                              : "eth"
                          )
                        }
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition"
                      >
                        <MdOutlineQrCodeScanner />
                      </button>

                      {/* Share Button */}
                      <button
                        onClick={() => handleCopy(chain.address, index)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition w-6 h-auto"
                      >
                        {copiedIndex === index ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <IoCopyOutline />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---------- SHOW FIAT UI ---------- */}
          {navigateCryptoFiat.fiat && (
            <div className="w-full bg-white rounded-2xl shadow-md p-6 space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 flex items-center justify-center bg-gray-100 rounded-xl">
                  <BsBank className="w-8 h-8 text-gray-700" />
                </div>
              </div>

              <p className="text-center text-xl font-semibold text-gray-900">
                Bank Transfer
              </p>

              <p className="text-gray-600 text-sm leading-relaxed text-center">
                Receive fiat money through your connected bank account.
              </p>

              <button
                onClick={() =>
                  setNavigateCryptoFiat({ crypto: false, fiat: false })
                }
                className="w-full mt-2 bg-black text-white py-3 rounded-xl font-medium hover:opacity-90 transition"
              >
                Back
              </button>
            </div>
          )}

          {/* ---------- DEFAULT SCREEN ---------- */}
          {!navigateCryptoFiat.crypto && !navigateCryptoFiat.fiat && (
            <>
              <h2 className="text-lg font-semibold text-gray-800">Receive</h2>

              <div
                onClick={() =>
                  setNavigateCryptoFiat({ crypto: true, fiat: false })
                }
                className="flex items-center gap-4 p-3 rounded-xl shadow-medium hover:bg-gray-50 cursor-pointer transition border"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
                  <Wallet className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">Crypto</p>
                  <p className="text-sm text-gray-500">
                    Receive assets from external wallet
                  </p>
                </div>
              </div>

              <div
                onClick={() =>
                  setNavigateCryptoFiat({ crypto: false, fiat: true })
                }
                className="flex items-center gap-4 p-3 rounded-xl shadow-medium hover:bg-gray-50 cursor-pointer transition border"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
                  <BsBank className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">Fiat</p>
                  <p className="text-sm text-gray-500">
                    Transfer money from bank
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
