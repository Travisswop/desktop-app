import React from "react";
import { PrimaryButton } from "../ui/Button/PrimaryButton";
import Image from "next/image";
import Link from "next/link";

interface Transaction {
  id: string;
  userName: string;
  userImage: string;
  status: string;
  walletAddress: string;
  date: string;
  timestamp: string;
  amount: string;
  cryptoAmount: string;
}

interface TransactionsListProps {
  transactions?: Transaction[];
}

const TransactionsListPreview: React.FC<TransactionsListProps> = ({
  transactions,
}) => {
  const defaultTransactions: Transaction[] = [
    {
      id: "1",
      userName: "HawkTuah",
      userImage: "https://i.pravatar.cc/150?img=12",
      status: "transition",
      walletAddress: "0x3rf....56hgj",
      date: "Jun 22, 2021",
      timestamp: "1/2/23 12:22PM",
      amount: "582.38",
      cryptoAmount: "82.78SOL",
    },
    {
      id: "2",
      userName: "HawkTuah",
      userImage: "https://i.pravatar.cc/150?img=12",
      status: "transition",
      walletAddress: "0x3rf....56hgj",
      date: "Jun 22, 2021",
      timestamp: "1/2/23 12:22PM",
      amount: "582.38",
      cryptoAmount: "82.78SOL",
    },
  ];

  const displayTransactions = transactions || defaultTransactions;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-gray-900">Transactions</h2>
        <Link href={"/wallet"}>
          <PrimaryButton className="text-sm">View</PrimaryButton>
        </Link>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {displayTransactions.map((transaction, index) => (
          <div key={transaction.id}>
            <div className="flex items-start gap-2">
              {/* User Avatar */}
              <div className="flex-shrink-0">
                <Image
                  src={transaction.userImage}
                  alt={transaction.userName}
                  width={200}
                  height={200}
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>

              {/* Transaction Details */}
              <div className="flex-1 min-w-0">
                {/* Name and Status */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {transaction.userName}
                  </h3>
                  {/* <span className="text-lg text-gray-400 font-normal">
                    {transaction.status}
                  </span> */}
                </div>

                {/* Wallet Address */}
                <div className="text-base font-medium text-gray-900 mb-1">
                  {transaction.walletAddress}
                </div>

                {/* Date */}
                <div className="text-sm text-gray-400">{transaction.date}</div>
              </div>

              {/* Right Side - Amounts and Time */}
              <div className="flex-shrink-0 text-right">
                {/* Timestamp */}
                <div className="text-sm text-gray-400 mb-3">
                  {transaction.timestamp}
                </div>

                {/* Amount */}
                <div className="text-xl font-semibold text-gray-900 mb-1">
                  {transaction.amount}
                </div>

                {/* Crypto Amount */}
                <div className="text-sm text-gray-400">
                  {transaction.cryptoAmount}
                </div>
              </div>
            </div>

            {/* Divider */}
            {index < displayTransactions.length - 1 && (
              <div className="mt-2 border-t border-gray-200"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionsListPreview;
