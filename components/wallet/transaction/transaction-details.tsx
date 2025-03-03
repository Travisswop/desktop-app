'use client';

import { Transaction } from '@/types/transaction';
import SwappedView from './swapped-view';
import SentReceivedView from './sent-received-view';

type Network = 'ETHEREUM' | 'POLYGON' | 'BASE' | 'SOLANA';
interface TransactionDetailsProps {
  transaction: Transaction | null;
  userAddress: string;
  network: Network;
  isOpen: boolean;
  onClose: () => void;
}

// Transaction Details Dialog
const TransactionDetails = ({
  transaction,
  userAddress,
  network,
  isOpen,
  onClose,
}: TransactionDetailsProps) => {
  if (!transaction) return null;

  if (transaction.isSwapped) {
    return (
      <SwappedView
        transaction={transaction}
        userAddress={userAddress}
        network={network}
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  return (
    <SentReceivedView
      transaction={transaction}
      userAddress={userAddress}
      network={network}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};

export default TransactionDetails;
