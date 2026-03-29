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
});

export function usePolymarketWallet() {
  return useContext(PolymarketWalletContext);
}

export function PolymarketWalletProvider({ children }: { children: ReactNode }) {
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [ethersSigner, setEthersSigner] =
    useState<providers.JsonRpcSigner | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const { wallets, ready } = useWallets();
  const { authenticated, user } = usePrivy();

  // Find the user's primary EVM wallet — prefer embedded wallet, fall back to any EVM wallet
  const wallet =
    wallets.find((w) => w.address === user?.wallet?.address) ??
    wallets.find((w) => w.walletClientType !== "solana");

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

    async function init() {
      if (!wallet || !eoaAddress) {
        // No EVM wallet available — stop initializing, no error
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
  }, [wallet, ready, eoaAddress]);

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
      }}
    >
      {children}
    </PolymarketWalletContext.Provider>
  );
}
