'use client';

/**
 * PredictionMarketsTab Component
 *
 * Main container component for the prediction markets feature.
 * Integrates market browsing, trading, and position management.
 */

import React, { useMemo } from 'react';
import { Tabs, Tab, Card, CardBody } from '@nextui-org/react';
import { TrendingUp, Wallet, History, BarChart3 } from 'lucide-react';
import { MarketList } from './MarketList';
import { PositionsList } from './PositionsList';
import { MarketDetails } from './MarketDetails';
import { TradePanel } from './TradePanel';
import CustomModal from '@/components/modal/CustomModal';
import { usePredictionMarketsStore } from '@/zustandStore/predictionMarketsStore';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { usePrivy } from '@privy-io/react-auth';

export const PredictionMarketsTab: React.FC = () => {
  const { authenticated } = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();

  const {
    currentView,
    setCurrentView,
    selectedMarket,
    setSelectedMarket,
    isTradeModalOpen,
    closeTradeModal,
  } = usePredictionMarketsStore();

  // Get Solana wallet address
  const solanaWalletAddress = useMemo(() => {
    if (!authenticated || !solanaWallets.length) return undefined;
    return solanaWallets[0]?.address;
  }, [authenticated, solanaWallets]);

  return (
    <div className="w-full space-y-4 p-4">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-green-500 to-emerald-600">
        <CardBody className="p-6">
          <div className="flex items-start justify-between">
            <div className="text-white">
              <h1 className="text-3xl font-bold mb-2">Prediction Markets</h1>
              <p className="text-green-50 max-w-2xl">
                Trade on the outcomes of future events. Buy shares in outcomes you
                believe will happen and earn profits when you're right.
              </p>
            </div>
            <BarChart3 className="w-16 h-16 text-green-200" />
          </div>
        </CardBody>
      </Card>

      {/* Wallet Connection Warning */}
      {!authenticated && (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardBody className="p-4">
            <p className="text-yellow-800 font-medium">
              Please connect your wallet to trade in prediction markets
            </p>
          </CardBody>
        </Card>
      )}

      {!solanaWalletAddress && authenticated && (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardBody className="p-4">
            <p className="text-yellow-800 font-medium">
              Solana wallet required for prediction markets. Please ensure you have a
              Solana wallet connected.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Main Navigation Tabs */}
      <Tabs
        selectedKey={currentView}
        onSelectionChange={(key) => setCurrentView(key as any)}
        color="success"
        variant="underlined"
        size="lg"
        classNames={{
          tabList: 'w-full',
          cursor: 'bg-green-600',
          tab: 'h-12',
          tabContent: 'group-data-[selected=true]:text-green-600',
        }}
      >
        <Tab
          key="markets"
          title={
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">Markets</span>
            </div>
          }
        >
          <div className="py-4">
            <MarketList />
          </div>
        </Tab>

        <Tab
          key="positions"
          title={
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <span className="font-semibold">My Positions</span>
            </div>
          }
        >
          <div className="py-4">
            {solanaWalletAddress ? (
              <PositionsList walletAddress={solanaWalletAddress} />
            ) : (
              <Card>
                <CardBody className="p-12 text-center">
                  <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    Connect your Solana wallet to view positions
                  </p>
                </CardBody>
              </Card>
            )}
          </div>
        </Tab>

        <Tab
          key="history"
          title={
            <div className="flex items-center gap-2">
              <History className="w-5 h-5" />
              <span className="font-semibold">History</span>
            </div>
          }
        >
          <div className="py-4">
            <Card>
              <CardBody className="p-12 text-center">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Transaction history</p>
                <p className="text-gray-500 text-sm mt-1">
                  Your trading history will appear here
                </p>
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

      {/* Market Details Modal */}
      {selectedMarket && (
        <CustomModal
          isOpen={!!selectedMarket}
          onCloseModal={() => setSelectedMarket(null)}
          width="max-w-4xl"
        >
          <div className="p-4">
            <MarketDetails
              marketId={selectedMarket.id}
              solanaWalletAddress={solanaWalletAddress}
            />
          </div>
        </CustomModal>
      )}

      {/* Trade Modal (if opened from other places) */}
      {isTradeModalOpen && selectedMarket && (
        <CustomModal isOpen={isTradeModalOpen} onCloseModal={closeTradeModal}>
          <div className="max-w-md">
            <h2 className="text-xl font-bold mb-4">{selectedMarket.title}</h2>
            <TradePanel
              market={selectedMarket}
              solanaWalletAddress={solanaWalletAddress}
            />
          </div>
        </CustomModal>
      )}
    </div>
  );
};

export default PredictionMarketsTab;
