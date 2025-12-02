import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChainId } from "@lifi/widget";
import LiFiPrivyWrapper from "./LiFiPrivyWrapper";
import { useWallets, useSolanaWallets } from "@privy-io/react-auth";
import { SolanaProvider } from "../SolanaProvider";
import { PrimaryButton } from "../ui/Button/PrimaryButton";
import { TbArrowsExchange2 } from "react-icons/tb";

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

  console.log("hola test", inputTokenParam, outputTokenParam, amountParam);

  // Auto-open modal if params exist
  useEffect(() => {
    if (inputTokenParam || outputTokenParam || amountParam) {
      setOpenSwapModal(true);
    }
  }, [inputTokenParam, outputTokenParam, amountParam]);

  useEffect(() => {
    // Only remove params AFTER modal is closed
    if (
      !openSwapModal &&
      (inputTokenParam || outputTokenParam || amountParam)
    ) {
      const newParams = new URLSearchParams(searchParams as any);
      newParams.delete("inputToken");
      newParams.delete("outputToken");
      newParams.delete("amount");

      router.replace(`${pathname}?${newParams.toString()}`);
    }
  }, [
    openSwapModal,
    inputTokenParam,
    outputTokenParam,
    amountParam,
    pathname,
    router,
    searchParams,
  ]);

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
      <PrimaryButton
        className="px-2 rounded"
        onClick={() => setOpenSwapModal(true)}
      >
        <TbArrowsExchange2 size={16} color="black" />
      </PrimaryButton>

      {/* Custom Modal */}
      {openSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setOpenSwapModal(false)}
          ></div>

          {/* Modal content */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-lg">
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
