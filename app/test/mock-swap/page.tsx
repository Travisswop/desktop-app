'use client';

import { Metadata } from 'next';
import MockSwapTester from '@/components/wallet/swapModal/utils/MockSwapTester';

export default function MockTransactionTestPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-2">
          Mock Transaction Test Page
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Use this page to test backend integration for various
          transaction types (swaps, token transfers, NFT transfers)
          without requiring an actual wallet or blockchain
          interaction. These transactions will be saved to the
          database for testing feed and history displays.
        </p>
      </div>

      <MockSwapTester />

      <div className="mt-10 text-center text-sm text-muted-foreground">
        <p>
          Note: This page is for development and testing purposes
          only. Mock transactions will be saved to the database but do
          not represent real blockchain transactions.
        </p>
      </div>
    </div>
  );
}
