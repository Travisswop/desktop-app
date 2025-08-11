import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import WalletChartButton from "../Button/WalletChartButton";
import { ChainId } from "@lifi/widget";
import { useEffect, useMemo } from "react";
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
  accessToken,
  onTokenRefresh,
  initialInputToken,
  initialOutputToken,
  initialAmount,
}: SwapButtonProps) {
  const [openSwapModal, setOpenSwapModal] = useState(false);
  const { wallets } = useWallets();
  const { wallets: solWallets } = useSolanaWallets();

  // Check if any wallets are connected
  const hasWallets =
    wallets.length > 0 || (solWallets && solWallets.length > 0);

  // Navigation hooks for URL parameters
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const inputTokenParam = searchParams?.get("inputToken");
  const outputTokenParam = searchParams?.get("outputToken");
  const amountParam = searchParams?.get("amount");

  // Clean up URL params when modal closes
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

  // Log wallet status for debugging
  useEffect(() => {
    console.log("Wallets status in SwapButton:", {
      ethWallets: wallets.length,
      solWallets: solWallets?.length || 0,
      hasWallets,
    });
  }, [wallets, solWallets, hasWallets]);

  // LiFi widget config
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
      // External wallet management is critical
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
      // Set initial values if available from URL parameters
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
    // Close modal on successful swap
    setOpenSwapModal(false);

    if (onTokenRefresh) {
      onTokenRefresh();
    }
  };

  return (
    <>
      <WalletChartButton onClick={() => setOpenSwapModal(true)}>
        <ArrowLeftRight size={16} /> Swap
      </WalletChartButton>

      {/* <Dialog open={openSwapModal} onOpenChange={setOpenSwapModal}>
        <DialogContent className="sm:max-w-[450px] md:max-w-[550px] p-0">
          <DialogTitle className="sr-only">Token Swap</DialogTitle>
          <DialogDescription className="sr-only">
            Swap tokens between chains using LiFi protocol
          </DialogDescription>
          <div className="p-4">
            <SolanaProvider>
              <LiFiPrivyWrapper
                config={config}
                onSwapComplete={handleSwapComplete}
              />
            </SolanaProvider>
          </div>
        </DialogContent>
      </Dialog> */}

      {/* <Dialog
        open={openSwapModal}
        onOpenChange={(open) => {
          // This will only run when we explicitly set `open` true/false.
          // We don't want it to close unless we trigger it ourselves.
          if (!open) return; // Ignore close triggers from outside click or Esc
          setOpenSwapModal(open);
        }}
      >
        <DialogContent
          className="sm:max-w-[450px] md:max-w-[550px] p-0"
          onPointerDownOutside={(e) => e.preventDefault()} // ⛔ block overlay click close
          onEscapeKeyDown={(e) => e.preventDefault()} // ⛔ block Esc close
        >
          <DialogTitle className="sr-only">Token Swap</DialogTitle>
          <DialogDescription className="sr-only">
            Swap tokens between chains using LiFi protocol
          </DialogDescription>

          
          <button
            onClick={() => setOpenSwapModal(false)}
            className="absolute top-3 right-32 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>

          <div className="p-4">
            <SolanaProvider>
              <LiFiPrivyWrapper
                config={config}
                onSwapComplete={handleSwapComplete}
              />
            </SolanaProvider>
          </div>
        </DialogContent>
      </Dialog> */}

      <Dialog
        open={openSwapModal}
        onOpenChange={(open) => {
          // Prevent Radix from closing the modal except when we do it manually
          if (!open) return;
          setOpenSwapModal(open);
        }}
      >
        <DialogContent
          //   className="sm:max-w-[450px] md:max-w-[550px] p-0"
          //   onPointerDownOutside={(e) => e.preventDefault()} // block overlay close
          //   onEscapeKeyDown={(e) => e.preventDefault()} // block esc close
          //   hideCloseButton // 👈 hides default "X"

          className="sm:max-w-[450px] md:max-w-[550px] p-0"
          //   onPointerDownOutside={(e) => {
          //     if (
          //       e.target instanceof HTMLElement &&
          //       e.target.closest("[data-privy-modal]")
          //     ) {
          //       return; // allow interaction with Privy modal
          //     }
          //     e.preventDefault();
          //   }}
          //   onFocusOutside={(e) => {
          //     if (
          //       e.target instanceof HTMLElement &&
          //       e.target.closest("[data-privy-modal]")
          //     ) {
          //       return; // allow focus shift to Privy modal inputs
          //     }
          //     e.preventDefault();
          //   }}
          //   onEscapeKeyDown={(e) => e.preventDefault()}
          hideCloseButton
        >
          <DialogTitle className="sr-only">Token Swap</DialogTitle>
          <DialogDescription className="sr-only">
            Swap tokens between chains using LiFi protocol
          </DialogDescription>

          {/* Custom X button */}
          <button
            onClick={() => setOpenSwapModal(false)}
            className="absolute top-3 right-3 rounded-md p-1 hover:bg-gray-100 focus:outline-none"
          >
            <span className="sr-only">Close</span>✕
          </button>

          <div className="p-4">
            <SolanaProvider>
              <LiFiPrivyWrapper
                config={config}
                onSwapComplete={handleSwapComplete}
              />
            </SolanaProvider>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
