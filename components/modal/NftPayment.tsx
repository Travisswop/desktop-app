'use client';
import React, { useEffect, useState } from 'react';
import { Modal, ModalContent, ModalBody } from '@nextui-org/react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWalletContext } from '@/lib/context/SolanaWalletContext';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import TokenSelector from '@/app/(public-profile)/sp/[username]/cart/TokenSelector';
import PaymentShipping from '@/app/(public-profile)/sp/[username]/cart/Shipping';
import { ChainType } from '@/types/nft';

const chains: ChainType[] = ['ETHEREUM', 'POLYGON', 'BASE', 'SOLANA'];

export default function NftPaymentModal({
  subtotal,
  isOpen,
  onOpenChange,
  customerInfo,
  cartItems,
  orderId,
}: {
  subtotal: number;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  customerInfo: any;
  cartItems: any[];
  orderId: string | null;
}) {
  const [walletData, setWalletData] = useState<any>(null);
  const [amontOfToken, setAmontOfToken] = useState<any>(null);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  // Preserve the initial payment data to prevent issues when cart is cleared
  const [paymentData, setPaymentData] = useState<{
    subtotal: number;
    customerInfo: any;
    cartItems: any[];
    orderId: string | null;
  } | null>(null);

  const { createWallet } = useSolanaWalletContext();
  const { authenticated, ready, user: PrivyUser } = usePrivy();
  const [solWalletAddress, setSolWalletAddress] = useState('');
  const [evmWalletAddress, setEvmWalletAddress] = useState('');

  // Store payment data when modal opens and subtotal is valid
  useEffect(() => {
    if (isOpen && subtotal > 0 && !paymentData) {
      setPaymentData({
        subtotal,
        customerInfo,
        cartItems,
        orderId,
      });
    }
  }, [
    isOpen,
    subtotal,
    customerInfo,
    cartItems,
    orderId,
    paymentData,
  ]);

  // Clear payment data when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPaymentData(null);
      setSelectedToken(null);
      setAmontOfToken(null);
    }
  }, [isOpen]);

  // Use stored payment data or fallback to props
  const currentSubtotal = paymentData?.subtotal || subtotal;
  const currentCustomerInfo =
    paymentData?.customerInfo || customerInfo;
  const currentCartItems = paymentData?.cartItems || cartItems;
  const currentOrderId = paymentData?.orderId || orderId;

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
    if (!walletData) return;

    const solWallet = walletData.find((w: any) => !w.isEVM);
    const evmWallet = walletData.find((w: any) => w.isEVM);

    setSolWalletAddress(solWallet?.address || '');
    setEvmWalletAddress(evmWallet?.address || '');
  }, [walletData]);

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

  // Data fetching hooks
  const { tokens } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddress,
    chains
  );

  useEffect(() => {
    const convertUSDToToken = (usdAmount: number) => {
      if (!selectedToken?.marketData?.price) return '0';
      const price = parseFloat(selectedToken.marketData.price);
      return (usdAmount / price).toFixed(4);
    };
    if (selectedToken && currentSubtotal > 0) {
      const amontOfToken = convertUSDToToken(currentSubtotal);
      setAmontOfToken(amontOfToken);
    }
  }, [selectedToken, currentSubtotal]);

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
                      subtotal={currentSubtotal}
                      selectedToken={selectedToken}
                      setSelectedToken={setSelectedToken}
                      amontOfToken={amontOfToken}
                      walletData={walletData}
                      customerInfo={currentCustomerInfo}
                      cartItems={currentCartItems}
                      orderId={currentOrderId}
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
