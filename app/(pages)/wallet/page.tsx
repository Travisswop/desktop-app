// 'use client';
import WalletContent from "@/components/wallet/WalletContent";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const Wallet: React.FC = () => {
  return (
    <>
      <WalletContent />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
};

export default Wallet;
