'use client';

import { useEffect, useState } from 'react';

import { ChevronRight, Loader2, Search, Wallet } from 'lucide-react';
import Image from 'next/image';
import { useDebounce } from 'use-debounce';
import { Transaction } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import { ReceiverData, SearchRecipient } from '@/types/wallet';
import { truncateAddress } from '@/lib/utils';
import RedeemModal, { RedeemConfig } from './redeem-modal';
import { TokenData } from '@/types/token';
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
import { BentoCard, AgentBadge } from '@/components/ui/bento';
import {
  looksLikePublicEnsName,
  resolvePublicEnsName,
} from '@/lib/api/publicEnsResolver';
import { resolveWalletRecipientViaBackend } from '@/lib/api/walletRecipientResolver';

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
  const { user, getAccessToken } = usePrivy();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 500);
  const [addressError, setAddressError] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  //store connection data
  const [connectionList, setConnectionList] = useState<
    SearchRecipient[]
  >([]);
  const [searchResults, setSearchResults] = useState<SearchRecipient[]>(
    [],
  );
  const [externalEnsResult, setExternalEnsResult] =
    useState<ReceiverData | null>(null);
  const [externalEnsResolving, setExternalEnsResolving] =
    useState(false);
  const [externalEnsError, setExternalEnsError] = useState('');

  const [isLoading, setIsLoading] = useState<any>(false);
  // const { solanaWallets } = useSolanaWalletContext();
  const { wallets: solanaWallets } = useSolanaWallets();

  const { user: userHookData, accessToken } = useUser();

  // const { tokenContent } = useTokenSendStore();

  // Remove the local network assignment, always use the prop
  // const network = selectedToken?.chain || 'ETHEREUM';

  const isValidAddress =
    searchQuery &&
    (([
      'ETHEREUM',
      'POLYGON',
      'BASE',
      'ARBITRUM',
      'ethereum',
      'polygon',
      'base',
      'arbitrum',
    ].includes(network) &&
      validateEthereumAddress(searchQuery)) ||
      ((network === 'SOLANA' || network === 'solana') &&
        validateSolanaAddress(searchQuery)));

  const isCurrentWalletAddress = (address: string) => {
    if (!address || !currentWalletAddress) return false;
    if (
      validateEthereumAddress(address) &&
      validateEthereumAddress(currentWalletAddress)
    ) {
      return address.toLowerCase() === currentWalletAddress.toLowerCase();
    }
    return address === currentWalletAddress;
  };

  const handleSelectReceiver = (receiver: ReceiverData) => {
    if (isCurrentWalletAddress(receiver.address)) {
      setAddressError(true);
      return;
    }
    onSelectReceiver(receiver);
  };

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

    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        'https://api.devnet.solana.com',
    );

    const totalAmount = parseFloat(config.totalAmount.toString());

    // Detect Privy embedded wallet → backend signs server-side (0 popups)
    const isPrivyEmbedded = solanaWallet.walletClientType === 'privy';
    const walletId = isPrivyEmbedded ? solanaWallet.id : undefined;

    // Step 0: create redemption pool
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/createRedeemptionPool`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          walletId, // undefined for external wallets
          // Authorizes the backend's user-wallet sponsored relay sign
          // (owner-enforced Privy apps require the user's own token).
          privyAccessToken: walletId
            ? await getAccessToken().catch(() => undefined)
            : undefined,
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to generate redeem link');
    }

    const { data } = await response.json();

    // ── Privy embedded: backend handled everything, no signing needed ──────
    if (!data.serializedTransaction) {
      updateStep(0, 'completed');
      updateStep(1, 'completed');
      updateStep(2, 'completed');
      setRedeemLink(`https://redeem.swopme.app/${data.poolId}`);
      return;
    }

    // ── External wallet: sign the combined tx (1 popup) ───────────────────
    updateStep(0, 'completed');
    updateStep(1, 'processing');

    try {
      const combinedTx = Transaction.from(
        Buffer.from(data.serializedTransaction, 'base64'),
      );
      // Refresh blockhash so Privy's internal RPC recognises it during preflight
      const { blockhash: freshBlockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('finalized');
      combinedTx.recentBlockhash = freshBlockhash;

      const serializedTx = new Uint8Array(
        combinedTx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        }),
      );

      const sendResult = await signAndSendTransaction({
        transaction: serializedTx,
        wallet: solanaWallet,
      });
      await connection.confirmTransaction({
        signature: bs58.encode(sendResult.signature),
        blockhash: freshBlockhash,
        lastValidBlockHeight,
      });

      updateStep(1, 'completed');
      updateStep(2, 'completed');
      setRedeemLink(`https://redeem.swopme.app/${data.poolId}`);
    } catch (error: any) {
      await deleteRedeemLink(user?.id || '', data.poolId);
      console.error('Combined transaction error:', error);

      let errorMessage = 'Failed to set up token holding account';
      if (error?.logs) {
        const logs = Array.isArray(error.logs) ? error.logs : [];
        if (
          logs.some((log: string) =>
            log.includes('insufficient lamports'),
          )
        ) {
          // Only external (non-embedded) wallets sign here — embedded wallets
          // are funded server-side with sponsored gas and never reach this.
          errorMessage =
            'Gas sponsorship does not cover external wallets, and this wallet has no SOL for the account rent. Switch to your Swop wallet or add a small amount of SOL.';
        } else if (
          logs.some((log: string) =>
            log.includes('insufficient funds for rent'),
          )
        ) {
          errorMessage =
            'Gas sponsorship does not cover external wallets, and this wallet has no SOL for the token-account rent. Switch to your Swop wallet or add a small amount of SOL.';
        }
      } else if (error?.message?.includes('insufficient lamports')) {
        errorMessage =
          'Gas sponsorship does not cover external wallets, and this wallet has no SOL for the account rent. Switch to your Swop wallet or add a small amount of SOL.';
      } else if (error?.message) {
        errorMessage = error.message;
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
      setExternalEnsResult(null);
      setExternalEnsResolving(false);
      setExternalEnsError('');
      setIsLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !userHookData?._id || !accessToken) {
      setConnectionList([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const getdata = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: '1',
          limit: '20',
        });

        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/following/${userHookData._id}?${queryParams}`;
        const data = await getConnectionsUserData(url, accessToken);
        if (cancelled) return;

        if (data?.state === 'success') {
          setConnectionList(data.data?.following || []);
        } else {
          setConnectionList([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    getdata();

    return () => {
      cancelled = true;
    };
  }, [accessToken, open, userHookData?._id]);

  useEffect(() => {
    if (!open || !userHookData?._id || !accessToken) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

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

      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/search?q=${debouncedQuery}&userId=${userHookData._id}&filter=all&${queryParams}`;
        const data = await getConnectionsUserData(url, accessToken);
        if (cancelled) return;

        if (data?.state === 'success') {
          const results = data.data?.results || [];

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
        } else {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    getSearchResults();

    return () => {
      cancelled = true;
    };
  }, [
    debouncedQuery,
    accessToken,
    open,
    userHookData?._id,
    connectionList,
  ]);

  useEffect(() => {
    const query = debouncedQuery.trim();
    const isResolvableName = query.includes('.') && !isValidAddress;
    if (!open || !isResolvableName) {
      setExternalEnsResult(null);
      setExternalEnsResolving(false);
      setExternalEnsError('');
      return;
    }

    let cancelled = false;
    setExternalEnsResolving(true);
    setExternalEnsError('');

    (async () => {
      const backendResolved = await resolveWalletRecipientViaBackend({
        recipientValue: query,
        chain: network,
        accessToken,
      });
      if (cancelled) return;

      if (backendResolved) {
        setExternalEnsResult(backendResolved);
        setExternalEnsError('');
        setExternalEnsResolving(false);
        return;
      }

      const shouldTryPublicEns =
        String(network || '').toUpperCase() !== 'SOLANA' &&
        !query.toLowerCase().endsWith('.sol') &&
        looksLikePublicEnsName(query);
      const resolved = shouldTryPublicEns
        ? await resolvePublicEnsName(query, network)
        : null;
      if (cancelled) return;

      if (resolved) {
        setExternalEnsResult({
          address: resolved.address,
          ensName: resolved.ensName,
          isEns: true,
        });
        setExternalEnsError('');
      } else {
        setExternalEnsResult(null);
        setExternalEnsError(`No recipient address found for ${query}.`);
      }
      setExternalEnsResolving(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, debouncedQuery, isValidAddress, network, open]);

  if (!selectedToken) return null;

  return (
    <>
      <CustomModal isOpen={open} onCloseModal={onOpenChange}>
        <div className="p-5 space-y-3">
          <p className="text-center text-[22px] leading-tight font-semibold tracking-[-0.02em] text-gray-900">
            Send To
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or wallet address"
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 pr-4 rounded-xl border border-black/[0.06] hover:border-black/[0.15] transition w-full py-2.5 text-[13px] outline-0 focus:outline-none"
            />
          </div>

          <ScrollArea className="h-96 space-y-2 -mx-5">
            <div className="px-4">
              {(isLoading || externalEnsResolving) && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}

              {selectedToken.chain.toLowerCase() === 'solana' && (
                <BentoCard
                  padding="p-4"
                  className="w-full cursor-pointer hover:border-black/[0.15] transition mb-1"
                  onClick={() => setIsRedeemModalOpen(true)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <BsSendFill />
                      </div>
                      <div>
                        <h3 className="text-[13px] font-medium text-gray-900">
                          Send to anyone using a link
                        </h3>
                        <p className="text-[12px] text-gray-500">
                          Share via Whatsapp, Email, Twitter...
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <ChevronRight className="h-4 w-4 text-gray-900" />
                    </div>
                  </div>
                </BentoCard>
              )}

              {/* Show wallet address preview */}
              {isValidAddress && !addressError && (
                <BentoCard
                  padding="p-4"
                  className="w-full cursor-pointer hover:border-black/[0.15] transition mt-4"
                  onClick={() =>
                    handleSelectReceiver({
                      address: searchQuery,
                      isEns: false,
                      ensName: undefined,
                      avatar: undefined,
                    })
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-[12px] text-gray-500">
                          Wallet Address
                        </span>
                        <p className="text-[13px] font-mono text-gray-500">
                          {truncateAddress(searchQuery)}
                        </p>
                      </div>
                    </div>
                  </div>
                </BentoCard>
              )}

              {externalEnsResult && !addressError && (
                <BentoCard
                  padding="p-4"
                  className="w-full cursor-pointer hover:border-black/[0.15] transition mt-4"
                  onClick={() => handleSelectReceiver(externalEnsResult)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-[12px] text-gray-500">
                          Recipient name
                        </span>
                        <p className="text-[13px] font-medium text-gray-900">
                          {externalEnsResult.ensName}
                        </p>
                        <p className="text-[13px] font-mono text-gray-500">
                          {truncateAddress(externalEnsResult.address)}
                        </p>
                      </div>
                    </div>
                  </div>
                </BentoCard>
              )}

              {externalEnsError && !externalEnsResolving && (
                <div className="px-1 py-2 text-[13px] text-gray-500">
                  {externalEnsError}
                </div>
              )}

              {searchQuery &&
              searchResults.length === 0 &&
              !isLoading &&
              !isValidAddress &&
              !externalEnsResult &&
              !externalEnsResolving &&
              !externalEnsError ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-[13px]">No results found</p>
                </div>
              ) : (
                (searchResults.length > 0
                  ? searchResults
                  : connectionList
                ).map((data: SearchRecipient) => (
                  <div
                    key={data._id}
                    className="w-full p-4 border-b border-black/[0.06] cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      handleSelectReceiver({
                        address:
                          (network?.toUpperCase() === 'SOLANA'
                            ? data.ensData?.solanaAddress
                            : data.ensData?.evmAddress) ||
                          // Agent-vault entries carry the vault address directly.
                          data.address ||
                          '',
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
                          <span className="flex items-center gap-1.5">
                            <span className="text-[13px] font-medium text-gray-900">
                              {data.name}
                            </span>
                            {data.isAgent && <AgentBadge />}
                          </span>
                          <p className="text-[12px] text-gray-500">
                            {data.ens}
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <ChevronRight className="h-4 w-4 text-gray-900" />
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
