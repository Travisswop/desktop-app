import { useState, useEffect, useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import WalletChartButton from "../Button/WalletChartButton";
import { ChainId } from "@lifi/widget";
import LiFiPrivyWrapper from "./LiFiPrivyWrapper";
import { useWallets, useSolanaWallets } from "@privy-io/react-auth";
import { SolanaProvider } from "../SolanaProvider";

interface SwapButtonProps {
  tokens: any[];
  accessToken: string;
  onTokenRefresh?: () => void;
  initialInputToken?: string;
  initialOutputToken?: string;
  initialAmount?: string;
}

export default function SwapButton({
  tokens,
  onTokenRefresh,
  initialInputToken,
  initialOutputToken,
  initialAmount,
}: SwapButtonProps) {
  const [openSwapModal, setOpenSwapModal] = useState(false);
  const { wallets } = useWallets();
  const { wallets: solWallets } = useSolanaWallets();

  const hasWallets =
    wallets.length > 0 || (solWallets && solWallets.length > 0);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const inputTokenParam = searchParams?.get("inputToken");
  const outputTokenParam = searchParams?.get("outputToken");
  const amountParam = searchParams?.get("amount");

  console.log("wallets", wallets);
  console.log("solWallets", solWallets);

  // console.log("tokensgg", tokens);
  console.log("inputTokenParam", inputTokenParam);
  console.log("outputTokenParam", outputTokenParam);
  console.log("amountParam", amountParam);

  useEffect(() => {
    if (
      !openSwapModal &&
      (inputTokenParam || outputTokenParam || amountParam)
    ) {
      const newSearchParams = new URLSearchParams(searchParams as any);
      newSearchParams.delete("inputToken");
      newSearchParams.delete("outputToken");
      newSearchParams.delete("amount");
      router.replace(`${pathname}?${newSearchParams.toString()}`);
    }
  }, [
    openSwapModal,
    pathname,
    router,
    searchParams,
    inputTokenParam,
    outputTokenParam,
    amountParam,
  ]);

  useEffect(() => {
    console.log("Wallets status in SwapButton:", {
      ethWallets: wallets.length,
      solWallets: solWallets?.length || 0,
      hasWallets,
    });
  }, [wallets, solWallets, hasWallets]);

  const config = useMemo(
    () => ({
      variant: "expandable",
      integrator: "nextjs-example",
      appearance: "light",
      containerStyle: {
        width: "100%",
        height: "100%",
        border: "none",
      },
      theme: {
        container: {
          border: "1px solid rgb(234, 234, 234)",
          borderRadius: "16px",
        },
      },
      walletManagement: {
        connect: {
          external: true,
          enabled: true,
        },
        disconnect: {
          enabled: false,
        },
      },
      sdkConfig: {
        rpcUrls: {
          [ChainId.SOL]: [
            "https://chaotic-restless-putty.solana-mainnet.quiknode.pro/",
            "https://dacey-pp61jd-fast-mainnet.helius-rpc.com/",
          ],
        },
      },
      fromToken: inputTokenParam || initialInputToken,
      toToken: outputTokenParam || initialOutputToken,
      fromAmount: amountParam || initialAmount,
    }),
    [
      inputTokenParam,
      initialInputToken,
      outputTokenParam,
      initialOutputToken,
      amountParam,
      initialAmount,
    ]
  );

  const handleSwapComplete = () => {
    // setOpenSwapModal(false);
    if (onTokenRefresh) {
      onTokenRefresh();
    }
  };

  return (
    <>
      <WalletChartButton onClick={() => setOpenSwapModal(true)}>
        <ArrowLeftRight size={16} /> Swap
      </WalletChartButton>

      {/* Custom Modal */}
      {openSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setOpenSwapModal(false)}
          ></div>

          {/* Modal content */}
          <div className="relative z-10 w-full max-w-lg rounded-lg bg-white shadow-lg">
            {/* Close Button */}
            <button
              onClick={() => setOpenSwapModal(false)}
              className="absolute top-3 right-3 rounded-md p-1 text-gray-600 hover:bg-gray-100 focus:outline-none"
            >
              ✕
            </button>

            {/* Modal Body */}
            <div className="p-4">
              <SolanaProvider>
                <LiFiPrivyWrapper
                  config={config}
                  onSwapComplete={handleSwapComplete}
                  tokens={tokens}
                />
              </SolanaProvider>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
