"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PiWalletBold } from "react-icons/pi";

interface AssetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setSendFlow: any;
}

export default function MethodSelector({
  open,
  onOpenChange,
  setSendFlow,
}: AssetSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-6 rounded-3xl">
        <div>
          <h3 className="text-xl font-semibold mb-2">Send</h3>
          <div className="flex flex-col gap-3">
            <button
              onClick={() =>
                setSendFlow((prev: any) => ({ ...prev, step: "assets" }))
              }
              className="p-2 rounded-xl shadow-medium flex items-center gap-3 text-start"
            >
              <span className="p-3 bg-gray-200 rounded-lg">
                <PiWalletBold />
              </span>
              <div>
                <h2 className="font-medium">To Wallet</h2>
                <p className="text-sm text-gray-400">
                  Send assets to crypto wallet
                </p>
              </div>
            </button>
            <button
              onClick={() =>
                setSendFlow((prev: any) => ({ ...prev, step: "bank-assets" }))
              }
              className="p-2 rounded-xl shadow-medium flex items-center gap-3 text-start"
            >
              <span className="p-3 bg-gray-200 rounded-lg">
                <PiWalletBold />
              </span>
              <div>
                <h2 className="font-medium">To Bank</h2>
                <p className="text-sm text-gray-400">
                  Send solana USDC to your bank
                </p>
              </div>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
