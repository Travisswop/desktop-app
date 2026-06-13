"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { WalletItem } from "@/types/wallet";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PiWalletBold } from "react-icons/pi";
import { copyTextToClipboard } from "@/lib/clipboard";

interface WalletAddressPopupProps {
  walletData: WalletItem[];
  show: boolean;
  onClose?: () => void;
}

const formatAddress = (address?: string) => {
  if (!address) return "Not connected";
  if (address.length <= 12) return address;
  return `${address.slice(0, 5)}...${address.slice(-5)}`;
};

const CopyButton = ({ content }: { content?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!content) return;

    const didCopy = await copyTextToClipboard(content);
    if (!didCopy) {
      alert("Could not copy address. Please try again.");
      return;
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      disabled={!content}
      className="h-8 w-8 shrink-0 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Copy wallet address"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 text-gray-500" />
      )}
    </Button>
  );
};

export default function WalletAddressPopup({
  walletData,
  show,
  onClose,
}: WalletAddressPopupProps) {
  const [selectReceive, setSelectReceive] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectReceive("");
  }, [show]);

  // 👇 Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show, onClose]);

  const scrollChains = (direction: "left" | "right") => {
    carouselRef.current?.scrollBy({
      left: direction === "left" ? -180 : 180,
      behavior: "smooth",
    });
  };

  if (!show) return null;
  const evm = walletData.filter((item) => item.isEVM);
  const sol = walletData.filter((item) => !item.isEVM);

  if (evm.length === 0 && sol.length === 0) return null;

  const solAddress = sol[0]?.address;
  const evmAddress = evm[0]?.address;
  const addresses = [
    {
      chain: "Solana",
      icon: "/assets/icons/sol.png",
      address: solAddress,
    },
    {
      chain: "Ethereum",
      icon: "/assets/icons/ETH.png",
      address: evmAddress,
    },
    {
      chain: "Polygon",
      icon: "/assets/icons/POL.png",
      address: evmAddress,
    },
    {
      chain: "Base",
      icon: "/assets/icons/base.png",
      address: evmAddress,
    },
    {
      chain: "Arbitrum",
      icon: "/assets/icons/arbitrum.png",
      address: evmAddress,
    },
  ];

  return (
    <Card
      ref={cardRef}
      className="absolute top-20 right-4 sm:right-12 w-[calc(100vw-2rem)] sm:w-[22rem] z-10 border bg-background border-none shadow-2xl shadow-slate-300"
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg font-normal">
          {selectReceive === "crypto"
            ? "Copy Wallet Address"
            : !selectReceive && "Receive"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {selectReceive === "crypto" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Receive on chain
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => scrollChains("left")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition hover:bg-gray-100"
                  aria-label="Previous chain"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollChains("right")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition hover:bg-gray-100"
                  aria-label="Next chain"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            <div
              ref={carouselRef}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pr-36 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {addresses.map((item) => (
                <div
                  key={item.chain}
                  className="flex min-w-[150px] snap-start flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-medium"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                    <Image
                      src={item.icon}
                      alt={item.chain}
                      width={34}
                      height={34}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">
                      {item.chain}
                    </div>
                    <div className="mt-1 text-xs font-mono text-muted-foreground">
                      {formatAddress(item.address)}
                    </div>
                  </div>
                  <CopyButton content={item.address} />
                </div>
              ))}
            </div>
          </div>
        )}
        {!selectReceive && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setSelectReceive("crypto")}
              className="p-2 rounded-xl shadow-medium flex items-center gap-3 text-start"
            >
              <span className="p-3 bg-gray-200 rounded-lg">
                <PiWalletBold />
              </span>
              <div>
                <h2 className="font-medium">Crypto</h2>
                <p className="text-sm text-gray-400">
                  Receive assets from external wallet
                </p>
              </div>
            </button>
            <button
              onClick={() => setSelectReceive("fiat")}
              disabled
              className="p-2 rounded-xl shadow-medium flex items-center gap-3 text-start"
            >
              <span className="p-3 bg-gray-200 rounded-lg">
                <PiWalletBold />
              </span>
              <div>
                <h2 className="font-medium">Fiat</h2>
                <p className="text-sm text-gray-400">
                  Transfer money from Bank
                </p>
              </div>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
