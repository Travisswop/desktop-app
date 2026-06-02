"use client";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { BsBank } from "react-icons/bs";
import CustomModal from "../modal/CustomModal";
import Link from "next/link";
import CoinbaseOnrampFunding from "./CoinbaseOnrampFunding";

export default function WalletFundandSettingsPopup() {
  const [isFundWalletOpen, setIsFundWalletOpen] = useState(false);

  return (
    <section className="p-4 space-y-3">
      <button
        onClick={() => setIsFundWalletOpen(true)}
        className="flex w-full text-start items-center gap-4 p-3 rounded-xl shadow-medium hover:bg-gray-50 cursor-pointer transition border"
      >
        <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
          <Wallet className="w-5 h-5 text-gray-700" />
        </div>
        <div>
          <p className="text-base font-medium text-gray-900">Fund</p>
          <p className="text-sm text-gray-500">Fund Your Wallet</p>
        </div>
      </button>

      <Link
        href="/wallet-settings"
        className="flex items-center gap-4 p-3 rounded-xl shadow-medium hover:bg-gray-50 cursor-pointer transition border"
      >
        <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
          <BsBank className="w-5 h-5 text-gray-700" />
        </div>
        <div>
          <p className="text-base font-medium text-gray-900">Settings</p>
          <p className="text-sm text-gray-500">Open Wallet Settings</p>
        </div>
      </Link>

      {isFundWalletOpen && (
        <CustomModal
          isOpen={isFundWalletOpen}
          onCloseModal={setIsFundWalletOpen}
          width="max-w-5xl"
        >
          <div className="relative bg-white rounded-2xl w-full mx-auto p-6">
            <CoinbaseOnrampFunding />
          </div>
        </CustomModal>
      )}
    </section>
  );
}
