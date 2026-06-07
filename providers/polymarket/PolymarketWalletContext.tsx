"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  type WalletClient,
  type PublicClient,
} from "viem";
import { providers } from "ethers5";
import { polygon } from "viem/chains";
import { useWallets, usePrivy } from "@privy-io/react-auth";
import { POLYGON_RPC_URL } from "@/constants/polymarket";
import { useUser } from "@/lib/UserContext";
import {
  getStoredEvmWalletAddress,
  selectPreferredWallet,
  shouldPreferEmbeddedWallets,
  shouldUseStoredWalletAddresses,
  walletAddressEquals,
} from "@/components/wallet/hooks/useWalletData";

export interface PolymarketWalletContextType {
  eoaAddress: `0x${string}` | undefined;
  walletClient: WalletClient | null;
  publicClient: PublicClient;
  ethersSigner: providers.JsonRpcSigner | null;
  isReady: boolean;
  isInitializing: boolean;
  hasWallet: boolean;
  authenticated: boolean;
  switchToPolygon: () => Promise<void>;
  retryInitialization: () => void;
}

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC_URL),
});

const PolymarketWalletContext = createContext<PolymarketWalletContextType>({
  eoaAddress: undefined,
  walletClient: null,
  publicClient,
  ethersSigner: null,
  isReady: false,
  isInitializing: true,
  hasWallet: false,
  authenticated: false,
  switchToPolygon: async () => {},
  retryInitialization: () => {},
});

export function usePolymarketWallet() {
  return useContext(PolymarketWalletContext);
}

export function PolymarketWalletProvider({ children }: { children: ReactNode }) {
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [ethersSigner, setEthersSigner] =
    useState<providers.JsonRpcSigner | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);

  const { wallets, ready } = useWallets();
  const { authenticated, user: privyUser } = usePrivy();
  const { user: swopUser } = useUser();

  const useEmbeddedWalletProvider = shouldPreferEmbeddedWallets();
  const storedEvmAddress = getStoredEvmWalletAddress(swopUser);
  const activeWallet = selectPreferredWallet(
    wallets,
    privyUser?.wallet?.address,
    {
      preferEmbedded: useEmbeddedWalletProvider,
      embeddedOnly: useEmbeddedWalletProvider,
    },
  );
  const shouldUseStoredEoa =
    authenticated &&
    shouldUseStoredWalletAddresses(
      privyUser?.id ?? swopUser?.privyId,
      swopUser,
      activeWallet?.address,
    ) &&
    Boolean(storedEvmAddress);

  // In local development, avoid extension-injected EVM providers by using the
  // embedded Privy wallet unless external wallet testing is explicitly enabled.
  const selectedWallet = shouldUseStoredEoa
    ? selectPreferredWallet(
        wallets,
        storedEvmAddress,
        {
          preferEmbedded: useEmbeddedWalletProvider,
          embeddedOnly: useEmbeddedWalletProvider,
        },
      )
    : activeWallet;
  const eoaAddress =
    authenticated && shouldUseStoredEoa
      ? (storedEvmAddress as `0x${string}`)
      : authenticated && selectedWallet
        ? (selectedWallet.address as `0x${string}`)
        : undefined;
  const wallet =
    selectedWallet && walletAddressEquals(selectedWallet.address, eoaAddress)
      ? selectedWallet
      : undefined;
  const hasWallet = Boolean(eoaAddress);

  const switchToPolygon = async () => {
    if (!wallet || !ready || !authenticated) return;

    try {
      const chainId = wallet.chainId;
      if (chainId !== `eip155:${polygon.id}`) {
        await wallet.switchChain(polygon.id);
      }
    } catch (err) {
      console.error("Failed to switch chain:", err);
      throw err;
    }
  };

  const retryInitialization = () => {
    setWalletClient(null);
    setEthersSigner(null);
    setIsInitializing(true);
    setRetryNonce((value) => value + 1);
  };

  useEffect(() => {
    // Wait until Privy has finished loading wallets
    if (!ready) return;

    async function init() {
      if (!wallet || !eoaAddress) {
        // No signing wallet available — reads can still use eoaAddress.
        setWalletClient(null);
        setEthersSigner(null);
        setIsInitializing(false);
        return;
      }

      try {
        const provider = await wallet.getEthereumProvider();

        const client = createWalletClient({
          account: eoaAddress,
          chain: polygon,
          transport: custom(provider),
        });

        setWalletClient(client);

        const ethersProvider = new providers.Web3Provider(provider);
        setEthersSigner(ethersProvider.getSigner());
      } catch (err) {
        console.error("Failed to initialize Polymarket wallet client:", err);
        setWalletClient(null);
        setEthersSigner(null);
      } finally {
        setIsInitializing(false);
      }
    }

    init();
  }, [wallet, ready, eoaAddress, retryNonce]);

  return (
    <PolymarketWalletContext.Provider
      value={{
        eoaAddress,
        walletClient,
        publicClient,
        ethersSigner,
        isReady: ready && authenticated && hasWallet && !isInitializing,
        isInitializing: !ready || isInitializing,
        hasWallet,
        authenticated,
        switchToPolygon,
        retryInitialization,
      }}
    >
      {children}
    </PolymarketWalletContext.Provider>
  );
}
