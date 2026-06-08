"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import {
  createWalletClient,
  createPublicClient,
  custom,
  fallback,
  http,
  type WalletClient,
  type PublicClient,
} from "viem";
import { providers } from "ethers5";
import { polygon } from "viem/chains";
import { useWallets, usePrivy } from "@privy-io/react-auth";
import { POLYGON_RPC_URLS } from "@/constants/polymarket";
import {
  selectPreferredWallet,
  shouldPreferEmbeddedWallets,
} from "@/components/wallet/hooks/useWalletData";
import { useUser } from "@/lib/UserContext";

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
  transport: fallback(POLYGON_RPC_URLS.map((url) => http(url))),
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
  const initializedWalletKeyRef = useRef<string | null>(null);

  const { wallets, ready } = useWallets();
  const { authenticated, user: privyUser } = usePrivy();
  const { user } = useUser();

  const useEmbeddedWalletProvider = shouldPreferEmbeddedWallets();

  // In local development, avoid extension-injected EVM providers by using the
  // embedded Privy wallet unless external wallet testing is explicitly enabled.
  const wallet = selectPreferredWallet(
    wallets,
    user?.ethereumWallet || privyUser?.wallet?.address,
    {
      preferEmbedded: useEmbeddedWalletProvider,
      embeddedOnly: useEmbeddedWalletProvider,
      preferredAddresses: [user?.ethereumWallet],
    },
  );

  const eoaAddress =
    authenticated && wallet ? (wallet.address as `0x${string}`) : undefined;
  const walletChainId = wallet?.chainId;
  const walletAddressKey = wallet?.address?.toLowerCase();
  const initializationKey =
    authenticated && walletChainId && walletAddressKey
      ? `${walletAddressKey}|${walletChainId}`
      : null;

  const hasWallet = !!wallet && !!eoaAddress;

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
    initializedWalletKeyRef.current = null;
    setRetryNonce((value) => value + 1);
  };

  useEffect(() => {
    // Wait until Privy has finished loading wallets
    if (!ready || !authenticated) {
      setWalletClient(null);
      setEthersSigner(null);
      setIsInitializing(false);
      initializedWalletKeyRef.current = null;
      return;
    }

    async function init() {
      if (!wallet || !walletAddressKey || !walletChainId || !initializationKey) {
        // No EVM wallet available — stop initializing, no error
        setWalletClient(null);
        setEthersSigner(null);
        setIsInitializing(false);
        initializedWalletKeyRef.current = null;
        return;
      }

      if (
        initializedWalletKeyRef.current === initializationKey &&
        walletClient &&
        ethersSigner
      ) {
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
        initializedWalletKeyRef.current = initializationKey;
      } catch (err) {
        console.error("Failed to initialize Polymarket wallet client:", err);
        setWalletClient(null);
        setEthersSigner(null);
      } finally {
        setIsInitializing(false);
      }
    }

    init();
  }, [ready, authenticated, walletAddressKey, walletChainId, retryNonce]);

  return (
    <PolymarketWalletContext.Provider
      value={{
        eoaAddress,
        walletClient,
        publicClient,
        ethersSigner,
        isReady: ready && authenticated && !!walletClient,
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
