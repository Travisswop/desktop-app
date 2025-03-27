"use client";

import { getDBExternalAccountInfo } from "@/actions/bank";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useUser } from "@/lib/UserContext";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
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
  const { user } = useUser();
  const [isBankCanProceed, setIsBankCanProceed] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const fetchExternalWallet = async () => {
      setLoading(true);
      const res = await getDBExternalAccountInfo(user._id);
      console.log("resss", res);
      if (res.success) {
        setIsBankCanProceed(true);
        setLoading(false);
      }
    };
    if (user?._id) {
      fetchExternalWallet();
    }
  }, [user?._id]);

  const handleSelectBank = () => {
    if (isBankCanProceed && !loading) {
      setSendFlow((prev: any) => ({ ...prev, step: "bank-assets" }));
    } else {
      toast.error("Please add bank account to continue.");
    }
  };
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
              onClick={handleSelectBank}
              // onClick={() =>
              //   setSendFlow((prev: any) => ({ ...prev, step: "bank-assets" }))
              // }
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
