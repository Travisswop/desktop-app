'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { NFT } from '@/types/nft';

interface NFTDetailProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFT;
}

export default function NFTDetailView({
  isOpen = false,
  onClose,
  nft,
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

        <div className="relative aspect-square w-full">
          <Image
            src={nft.image}
            alt={nft.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
            <div>
              <h2 className="text-xl font-semibold line-clamp-2">
                {nft.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                #{nft.contract}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
              {nft.description}
            </p>
          </div>

          <div className="flex justify-center">
            <Button variant="black" className="px-10 font-bold">
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
