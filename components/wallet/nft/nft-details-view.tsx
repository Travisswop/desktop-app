"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NFT } from "@/types/nft";
import NFTImage from "./nft-image";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";

interface NFTDetailProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFT;
  onNext: () => void;
}

export default function NFTDetailView({
  isOpen = false,
  onClose,
  nft,
  onNext,
}: NFTDetailProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle></DialogTitle>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="w-full flex justify-center pt-5">
          <NFTImage
            src={nft.image}
            alt={nft.name}
            className="rounded-2xl"
            width={320}
            height={320}
          />
        </div>

        <div className="p-6 pt-0 space-y-6">
          <div>
            <h2 className="text-xl font-semibold line-clamp-2">{nft.name}</h2>
            <p className="text-sm text-muted-foreground">#{nft.contract}</p>
          </div>

          {nft.description && (
            <div className="">
              <h3 className="font-semibold">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                {nft.description}
              </p>
            </div>
          )}

          <div className="flex justify-center">
            <PrimaryButton className="px-10 font-bold" onClick={onNext}>
              Send
            </PrimaryButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
