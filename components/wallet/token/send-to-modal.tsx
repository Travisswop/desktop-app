'use client';

import { useEffect, useState } from 'react';

import { ChevronRight, Loader2, Search, Wallet } from 'lucide-react';
import Image from 'next/image';
import { useDebounce } from 'use-debounce';
import { Transaction } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import { ReceiverData } from '@/types/wallet';
import { truncateAddress } from '@/lib/utils';
import RedeemModal, { RedeemConfig } from './redeem-modal';
import { TokenData } from '@/types/token';

import { TransactionService } from '@/services/transaction-service';
import { usePrivy } from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
} from '@privy-io/react-auth/solana';
import bs58 from 'bs58';
import { BsSendFill } from 'react-icons/bs';
import isUrl from '@/lib/isUrl';
import { useUser } from '@/lib/UserContext';
import CustomModal from '@/components/modal/CustomModal';
import { getConnectionsUserData } from '@/actions/getEnsData';
import { ScrollArea } from '@/components/ui/scroll-area';

type ProcessingStep = {
  status: 'pending' | 'processing' | 'completed' | 'error';
  message: string;
};

const validateEthereumAddress = (address: string) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const validateSolanaAddress = (address: string) => {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

interface SendToModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectReceiver: (receiver: ReceiverData) => void;
  network: string;
  currentWalletAddress: string;
  selectedToken: TokenData;
  amount: string;
  isUSD: boolean;
  solBalance?: number; // User's SOL balance for rent calculation
}

export default function SendToModal({
  open = false,
  onOpenChange,
  onSelectReceiver,
  network,
  currentWalletAddress,
  selectedToken,
  amount,
  isUSD,
  solBalance = 0,
}: SendToModalProps) {
  const { user } = usePrivy();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 500);
  const [addressError, setAddressError] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  //store connection data
  const [connectionList, setConnectionList] = useState([]);
  const [searchResults, setSearchResults] = useState<any>([]);

  const [isLoading, setIsLoading] = useState<any>(false);
  // const { solanaWallets } = useSolanaWalletContext();
  const { wallets: solanaWallets } = useSolanaWallets();

  const { user: userHookData, accessToken } = useUser();

  // const { tokenContent } = useTokenSendStore();

  // Remove the local network assignment, always use the prop
  // const network = selectedToken?.chain || 'ETHEREUM';

  console.log('selectedToken gg', selectedToken);

  const isValidAddress =
    searchQuery &&
    (([
      'ETHEREUM',
      'POLYGON',
      'BASE',
      'ethereum',
      'polygon',
      'base',
    ].includes(network) &&
      validateEthereumAddress(searchQuery)) ||
      ((network === 'SOLANA' || network === 'solana') &&
        validateSolanaAddress(searchQuery)));

  const handleSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setSearchQuery(e.target.value);
    setAddressError(false);
  };

  const deleteRedeemLink = async (userId: string, poolId: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/deleteRedeemLink`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyUserId: userId,
          poolId: poolId,
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to delete redeem link');
    }
  };

  const handleRedeem = async (
    config: RedeemConfig,
    updateStep: (
      index: number,
      status: ProcessingStep['status'],
      message?: string,
    ) => void,
    setRedeemLink: (link: string) => void,
  ) => {
    const solanaWallet = solanaWallets[0];

    if (!solanaWallet?.address) {
      throw new Error(
        'Please connect your wallet to create a redeem link.',
      );
    }

    // const connection = new Connection(clusterApiUrl('devnet'));

    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        'https://api.devnet.solana.com',
    );

    // Convert amount to proper decimal format
    const totalAmount = parseFloat(config.totalAmount.toString());

    // Create redemption link
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/createRedeemptionPool`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyUserId: user?.id,
          tokenName: selectedToken.name,
          tokenMint: selectedToken.address,
          tokenSymbol: selectedToken.symbol,
          tokenLogo: selectedToken.logoURI,
          totalAmount,
          tokenDecimals: selectedToken.decimals,
          tokensPerWallet: config.tokensPerWallet,
          maxWallets: config.maxWallets,
          creator: solanaWallet.address,
          isNative: selectedToken.isNative,
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to generate redeem link');
    }

    // Update step 1 to completed and step 2 to processing
    updateStep(0, 'completed');
    updateStep(1, 'processing');

    const { data } = await response.json();

    try {
      const setupTx = Transaction.from(
        Buffer.from(data.serializedTransaction, 'base64'),
      );
      // Serialize transaction to Uint8Array for Privy v3
      const serializedSetupTx = new Uint8Array(
        setupTx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        }),
      );
      // Use Privy's signAndSendTransaction with gas sponsorship
      const setupResult = await signAndSendTransaction({
        transaction: serializedSetupTx,
        wallet: solanaWallet,
      });
      await connection.confirmTransaction(
        bs58.encode(setupResult.signature),
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      await deleteRedeemLink(user?.id || '', data.poolId);
      console.error('Setup transaction error:', error);

      // Extract meaningful error message from SendTransactionError
      let errorMessage = 'Failed to set up temporary account';
      if (error?.logs) {
        const logs = Array.isArray(error.logs) ? error.logs : [];
        if (
          logs.some((log: string) =>
            log.includes('insufficient lamports'),
          )
        ) {
          errorMessage =
            'Insufficient SOL balance to cover rent fees. Please add more SOL to your wallet.';
        }
      } else if (error?.message?.includes('insufficient lamports')) {
        errorMessage =
          'Insufficient SOL balance to cover rent fees. Please add more SOL to your wallet.';
      }

      throw new Error(errorMessage);
    }

    // Update step 2 to completed and step 3 to processing
    updateStep(1, 'completed');
    updateStep(2, 'processing');

    // Handle token transfer
    try {
      const txSignature =
        await TransactionService.handleRedeemTransaction(
          solanaWallet,
          connection,
          {
            totalAmount:
              totalAmount * Math.pow(10, selectedToken.decimals),
            tokenAddress: selectedToken.address,
            tokenDecimals: selectedToken.decimals,
            tempAddress: data.tempAddress,
          },
          undefined, // signTransactionFn (unused)
          signAndSendTransaction, // signAndSendTransactionFn with sponsor support
        );

      await connection.confirmTransaction(txSignature);

      // Update final step to completed
      updateStep(2, 'completed');
      const redeemLink = `https://redeem.swopme.app/${data.poolId}`;
      // Set the redeem link
      setRedeemLink(redeemLink);
    } catch (error: any) {
      console.error('error', error);
      await deleteRedeemLink(user?.id || '', data.poolId); // Call to delete redeem link

      let errorMessage = 'Failed to transfer tokens';

      if (error.name === 'SendTransactionError') {
        const { message, logs } =
          TransactionService.parseSendTransactionError(error);
        console.error('Transaction error logs:', logs);

        if (
          logs.some((log) =>
            log.includes(
              'Please upgrade to SPL Token 2022 for immutable owner support',
            ),
          )
        ) {
          errorMessage =
            'This token requires SPL Token 2022 support. Please try again with sufficient SOL balance for rent.';
        } else if (
          logs.some((log) =>
            log.includes('insufficient funds for rent'),
          )
        ) {
          errorMessage =
            'Insufficient SOL balance to cover rent for token account. Please add more SOL to your wallet.';
        } else {
          errorMessage = message || 'Failed to transfer tokens';
        }
      } else {
        errorMessage = error.message || 'Failed to transfer tokens';
      }

      throw new Error(errorMessage);
    }
  };

  // Add this after your existing useEffects
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setAddressError(false);
      setSearchResults([]);
      setIsLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const getdata = async () => {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '20',
      });

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/following/${userHookData?._id}?${queryParams}`;
      const data = await getConnectionsUserData(
        url,
        accessToken || '',
      );
      if (data.state === 'success') {
        setConnectionList(data.data.following);
      }
      setIsLoading(false);
    };
    getdata();
  }, [accessToken, userHookData?._id]);

  useEffect(() => {
    const getSearchResults = async () => {
      setIsLoading(true);
      if (!debouncedQuery || debouncedQuery.length < 1) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }

      const queryParams = new URLSearchParams({
        page: '1',
        limit: '20',
      });

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/search?q=${debouncedQuery}&userId=${userHookData?._id}&filter=all&${queryParams}`;
      const data = await getConnectionsUserData(
        url,
        accessToken || '',
      );

      if (data.state === 'success') {
        const results = data.data.results || [];

        // Create a Set of connection ENS names for quick lookup
        const connectionEnsSet = new Set(
          connectionList.map((conn: any) => conn.ens),
        );

        // Separate search results into connections and non-connections
        const matchedConnections: any[] = [];
        const otherResults: any[] = [];

        results.forEach((result: any) => {
          if (connectionEnsSet.has(result.ens)) {
            matchedConnections.push(result);
          } else {
            otherResults.push(result);
          }
        });

        // Combine with matched connections first
        setSearchResults([...matchedConnections, ...otherResults]);
      }
      setIsLoading(false);
    };

    getSearchResults();
  }, [
    debouncedQuery,
    accessToken,
    userHookData?._id,
    connectionList,
  ]);

  if (!selectedToken) return null;

  return (
    <>
      <CustomModal isOpen={open} onCloseModal={onOpenChange}>
        <div className="p-5 space-y-3">
          <p className="text-center text-xl font-semibold">Send To</p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Network"
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 pr-4 rounded-xl shadow-medium w-full py-2.5 border-0 outline-0 focus:outline-none"
            />
          </div>

          <ScrollArea className="h-96 space-y-2 -mx-5">
            <div className="px-4">
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}

              {selectedToken.chain.toLowerCase() === 'solana' && (
                <div
                  className="w-full p-4 rounded-2xl cursor-pointer shadow-md bg-white mb-1"
                  onClick={() => setIsRedeemModalOpen(true)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <BsSendFill />
                      </div>
                      <div>
                        <h3 className="font-medium text-black">
                          Send to anyone using a link
                        </h3>
                        <p className="text-sm text-gray-500">
                          Share via Whatsapp, Email, Twitter...
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <ChevronRight className="h-5 w-5 text-black" />
                    </div>
                  </div>
                </div>
              )}

              {/* Show wallet address preview */}
              {isValidAddress && !addressError && (
                <div
                  className="w-full p-4 rounded-2xl bg-white shadow-medium cursor-pointer mt-4"
                  onClick={() =>
                    onSelectReceiver({
                      address: searchQuery,
                      isEns: false,
                      ensName: undefined,
                      avatar: undefined,
                    })
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">
                          Wallet Address
                        </span>
                        <p className="text-sm text-gray-500">
                          {truncateAddress(searchQuery)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {searchQuery &&
              searchResults.length === 0 &&
              !isLoading &&
              !isValidAddress ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No results found</p>
                </div>
              ) : (
                (searchResults.length > 0
                  ? searchResults
                  : connectionList
                ).map((data: any) => (
                  <div
                    key={data._id}
                    className="w-full p-4 border-b cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      onSelectReceiver({
                        address:
                          network?.toUpperCase() === 'SOLANA'
                            ? data.ensData.solanaAddress
                            : data.ensData.evmAddress,
                        ensName: data.ens,
                        isEns: true,
                        avatar: data.profilePic,
                      })
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {data.profilePic && (
                          <Image
                            src={
                              isUrl(data.profilePic)
                                ? data.profilePic
                                : `/images/user_avator/${data.profilePic}@3x.png`
                            }
                            alt={data.ens || ''}
                            width={120}
                            height={120}
                            className="rounded-full w-10 h-10"
                          />
                        )}
                        <div>
                          <span className="font-medium">
                            {data.name}
                          </span>
                          <p className="text-sm text-gray-500">
                            {data.ens}
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <ChevronRight className="h-5 w-5 text-black" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CustomModal>

      {selectedToken && (
        <RedeemModal
          isOpen={isRedeemModalOpen}
          onClose={() => setIsRedeemModalOpen(false)}
          onConfirm={handleRedeem}
          tokenAmount={parseFloat(amount)}
          tokenBalance={selectedToken.balance}
          tokenLogo={selectedToken.logoURI}
          tokenSymbol={selectedToken.symbol}
          tokenDecimals={selectedToken.decimals}
          tokenPrice={selectedToken.marketData?.price || '0'}
          solBalance={solBalance}
          isUSD={isUSD}
        />
      )}
    </>
  );
}
