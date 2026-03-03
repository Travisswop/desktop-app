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

  const { wallets, ready } = useWallets();
  const { authenticated, user } = usePrivy();

  // Find the user's primary wallet
  const wallet = wallets.find((w) => w.address === user?.wallet?.address);
  const eoaAddress =
    authenticated && wallet ? (wallet.address as `0x${string}`) : undefined;

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
    async function init() {
      if (!wallet || !ready || !eoaAddress) {
        setWalletClient(null);
        setEthersSigner(null);
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
        authenticated,
        switchToPolygon,
      }}
    >
      {children}
    </PolymarketWalletContext.Provider>
  );
}
