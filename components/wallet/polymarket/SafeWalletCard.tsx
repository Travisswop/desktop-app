'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, QrCode } from 'lucide-react';
import { useTrading } from '@/providers/polymarket';
import Card from './shared/Card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Image from 'next/image';

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function SafeWalletCard() {
  const { safeAddress } = useTrading();
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const handleCopy = async () => {
    if (!safeAddress) return;
    await navigator.clipboard.writeText(safeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!safeAddress) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">
              Initializing wallet...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">
            Trading Wallet
          </h3>
          <div className="flex items-center gap-1">
            <Image
              src="/assets/icons/polygon.png"
              alt="Polygon"
              width={16}
              height={16}
            />
            <span className="text-xs text-gray-500">Polygon</span>
          </div>
        </div>

        {/* Address with Copy */}
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 text-sm font-bold">
                S
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Safe Address</p>
              <p className="text-sm font-mono text-gray-900 truncate">
                {formatAddress(safeAddress)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowQRModal(true)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Show QR Code"
            >
              <QrCode className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Copy Address"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          Send USDC.e on Polygon to this address to fund your trading
          account
        </p>
      </Card>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-sm p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-semibold">
              Trading Wallet Address
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-xl shadow-md">
              <QRCodeSVG
                value={safeAddress}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="flex items-center gap-2">
              <Image
                src="/assets/icons/polygon.png"
                alt="Polygon"
                width={20}
                height={20}
              />
              <span className="text-sm text-gray-600">
                Polygon Network
              </span>
            </div>
            <div className="w-full bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 text-center">
                Safe Wallet Address
              </p>
              <p className="text-sm font-mono text-gray-900 text-center break-all">
                {safeAddress}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="w-full py-3 px-4 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Address
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Only send USDC.e on the Polygon network to this address
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
