'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ModalContent, ModalBody } from '@nextui-org/react';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import TokenSelector from '@/app/(public-profile)/sp/[username]/cart/TokenSelector';
import PaymentShipping from '@/app/(public-profile)/sp/[username]/cart/Shipping';

const chains: ChainType[] = ['ETHEREUM', 'POLYGON', 'BASE', 'SOLANA'];

export default function NftPaymentModal({
  subtotal,
  isOpen,
  onOpenChange,
  sellerAddress,
}: any) {
  const [walletData, setWalletData] = useState<any>(null);
  const [amontOfToken, setAmontOfToken] = useState<any>(null);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const { createWallet, wallets: solanaWallets } = useSolanaWallets();
  const { authenticated, ready, user: PrivyUser } = usePrivy();
  const [solWalletAddress, setSolWalletAddress] = useState('');
  const [evmWalletAddress, setEvmWalletAddress] = useState('');
  // Effects
  useEffect(() => {
    if (authenticated && ready && PrivyUser) {
      const linkWallet = PrivyUser?.linkedAccounts
        .map((item: any) => {
          if (item.chainType === 'ethereum') {
            return {
              address: item.address,
              isActive:
                item.walletClientType === 'privy' ||
                item.connectorType === 'embedded',
              isEVM: true,
              walletClientType: item.walletClientType,
            };
          } else if (item.chainType === 'solana') {
            return {
              address: item.address,
              isActive:
                item.walletClientType === 'privy' ||
                item.connectorType === 'embedded',
              isEVM: false,
              walletClientType: item.walletClientType,
            };
          }
          return null;
        })
        .filter(Boolean);

      setWalletData(linkWallet);
    }
  }, [PrivyUser, authenticated, ready]);

  useEffect(() => {
    if (authenticated && ready && PrivyUser) {
      const hasExistingSolanaWallet = PrivyUser.linkedAccounts.some(
        (account: any) =>
          account.type === 'wallet' &&
          account.walletClientType === 'privy' &&
          account.chainType === 'solana'
      );

      if (!hasExistingSolanaWallet) {
        createWallet();
      }
    }
  }, [authenticated, ready, PrivyUser, createWallet]);

  const network = 'SOLANA';

  // Memoized values
  const currentWalletAddress = useMemo(() => {
    if (!walletData) return undefined;
    setSolWalletAddress(
      walletData.find((w: any) => !w.isEVM)?.address || ''
    );
    setEvmWalletAddress(
      walletData.find((w: any) => w.isEVM)?.address || ''
    );
  }, [walletData]);

  // Data fetching hooks
  const {
    tokens,
    loading: tokenLoading,
    error: tokenError,
  } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddress,
    chains
  );

  useEffect(() => {
    const convertUSDToToken = (usdAmount: number) => {
      if (!selectedToken?.marketData.price) return '0';
      const price = parseFloat(selectedToken.marketData.price);
      return (usdAmount / price).toFixed(4);
    };
    if (selectedToken) {
      const amontOfToken = convertUSDToToken(subtotal);
      setAmontOfToken(amontOfToken);
    }
  }, [selectedToken, subtotal]);

  return (
    <>
      {isOpen && (
        <>
          <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
              <div className="w-full">
                <ModalBody className="text-center">
                  {selectedToken ? (
                    <PaymentShipping
                      subtotal={subtotal}
                      selectedToken={selectedToken}
                      setSelectedToken={setSelectedToken}
                      amontOfToken={amontOfToken}
                      walletData={walletData}
                      sellerAddress={sellerAddress}
                    />
                  ) : (
                    <TokenSelector
                      assets={tokens}
                      setSelectedToken={setSelectedToken}
                    />
                  )}
                </ModalBody>
              </div>
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
}
