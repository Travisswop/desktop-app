"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
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

const WALLET_PROVIDER_TIMEOUT_MS = 12_000;

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

function isEvmWallet(wallet: { address?: string; walletClientType?: string }) {
  return (
    wallet.walletClientType !== "solana" &&
    typeof wallet.address === "string" &&
    wallet.address.startsWith("0x")
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(
      () => reject(new Error("Timed out initializing EVM wallet")),
      ms,
    );

    promise.then(
      (value) => {
        window.clearTimeout(id);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(id);
        reject(error);
      },
    );
  });
}

export function PolymarketWalletProvider({ children }: { children: ReactNode }) {
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [ethersSigner, setEthersSigner] =
    useState<providers.JsonRpcSigner | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initAttempt, setInitAttempt] = useState(0);

  const { wallets, ready } = useWallets();
  const { authenticated, user } = usePrivy();

  // Find the user's primary EVM wallet — prefer embedded wallet, fall back to any EVM wallet
  const wallet = useMemo(
    () =>
      wallets.find(
        (w) => w.address === user?.wallet?.address && isEvmWallet(w),
      ) ?? wallets.find(isEvmWallet),
    [wallets, user?.wallet?.address],
  );

  const eoaAddress =
    authenticated && wallet ? (wallet.address as `0x${string}`) : undefined;

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

  useEffect(() => {
    // Wait until Privy has finished loading wallets
    if (!ready) return;

    let cancelled = false;

    async function init() {
      setIsInitializing(true);

      if (!wallet || !eoaAddress) {
        // No EVM wallet available — stop initializing, no error
        if (!cancelled) {
          setWalletClient(null);
          setEthersSigner(null);
          setIsInitializing(false);
        }
        return;
      }

      try {
        const provider = await withTimeout(
          wallet.getEthereumProvider(),
          WALLET_PROVIDER_TIMEOUT_MS,
        );

        const client = createWalletClient({
          account: eoaAddress,
          chain: polygon,
          transport: custom(provider),
        });

        if (cancelled) return;

        setWalletClient(client);
        const ethersProvider = new providers.Web3Provider(provider);
        setEthersSigner(ethersProvider.getSigner());
      } catch (err) {
        console.error("Failed to initialize Polymarket wallet client:", err);
        if (!cancelled) {
          setWalletClient(null);
          setEthersSigner(null);
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [wallet, ready, eoaAddress, initAttempt]);

  const retryInitialization = () => {
    setInitAttempt((attempt) => attempt + 1);
  };

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
