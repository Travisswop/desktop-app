'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';

import { useEffect, useState } from 'react';

interface WalletQRShareProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  setQRCodeShareUrl: (url: string) => void;
  setQRCodeShareModalOpen: (open: boolean) => void;
}

export default function WalletQRShare({
  open = false,
  onOpenChange,
  walletAddress,
  setQRCodeShareUrl,
  setQRCodeShareModalOpen,
}: WalletQRShareProps) {
  const handleShare = () => {
    // Get the QR code SVG element
    const qrCodeElement = document.getElementById('qrcode');
    if (!qrCodeElement) return;

    // Convert SVG to base64 string
    const svgData = new XMLSerializer().serializeToString(
      qrCodeElement
    );
    const base64Data = btoa(svgData);
    const base64Url = `data:image/svg+xml;base64,${base64Data}`;

    console.log('QR Code Base64 URL:', base64Url);
    setQRCodeShareUrl(base64Url);
    setQRCodeShareModalOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold sr-only">
              Wallet QR
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <span className="sr-only">Close</span>
            </button>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Wallet QR</h1>
            <p className="text-sm text-gray-500 mt-2">
              Scan the QR code to instantly connect your wallet
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              id="qrcode"
              value={walletAddress}
              size={200}
              level="H"
              includeMargin
              className="w-full h-auto border-black border-2 rounded-3xl"
            />
          </div>

          <Button
            onClick={handleShare}
            className="w-full bg-black text-white hover:bg-gray-800 rounded-xl py-6"
          >
            Share Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
