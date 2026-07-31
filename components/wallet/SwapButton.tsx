import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import LiFiPrivyWrapper from "./LiFiPrivyWrapper";
import { SolanaProvider } from "../SolanaProvider";
import { PrimaryButton } from "../ui/Button/PrimaryButton";
import { TbArrowsExchange2 } from "react-icons/tb";
import CustomModal from "../modal/CustomModal";

interface SwapButtonProps {
  tokens: any[];
  accessToken: string;
  onTokenRefresh?: () => void;
}

export default function SwapButton({
  tokens,
  onTokenRefresh,
}: SwapButtonProps) {
  const [openSwapModal, setOpenSwapModal] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const inputTokenParam = searchParams?.get("inputToken");
  const outputTokenParam = searchParams?.get("outputToken");
  const amountParam = searchParams?.get("amount");
  const outputChainParam = searchParams?.get("outputChain");
  const hasSwapUrlParams = Boolean(
    inputTokenParam ||
      outputTokenParam ||
      amountParam ||
      outputChainParam ||
      searchParams?.get("inputMint") ||
      searchParams?.get("outputMint") ||
      searchParams?.get("copyTrade") ||
      searchParams?.get("copyTradePostId")
  );
  const wasSwapModalOpenRef = useRef(false);

  // Auto-open modal if params exist
  useEffect(() => {
    if (hasSwapUrlParams) {
      setOpenSwapModal(true);
    }
  }, [hasSwapUrlParams]);

  useEffect(() => {
    const wasOpen = wasSwapModalOpenRef.current;
    wasSwapModalOpenRef.current = openSwapModal;

    if (!wasOpen || openSwapModal || !hasSwapUrlParams || !pathname) {
      return;
    }

    const newParams = new URLSearchParams(searchParams as any);
    // existing params
    newParams.delete("inputToken");
    newParams.delete("inputChain");
    newParams.delete("outputToken");
    newParams.delete("outputChain");
    newParams.delete("amount");
    // new feed params
    newParams.delete("inputMint");
    newParams.delete("inputImg");
    newParams.delete("inputDecimals");
    newParams.delete("outputMint");
    newParams.delete("outputImg");
    newParams.delete("outputDecimals");
    newParams.delete("copyTrade");
    newParams.delete("copyTradePostId");

    const nextQuery = newParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [
    openSwapModal,
    hasSwapUrlParams,
    pathname,
    router,
    searchParams,
  ]);

  const handleSwapComplete = () => {
    if (onTokenRefresh) {
      onTokenRefresh();
    }
  };

  const handleSwapReceiptDismiss = () => {
    setOpenSwapModal(false);
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
        <CustomModal
          isOpen={openSwapModal}
          onClose={() => setOpenSwapModal(false)}
        >
          <div className="p-4">
            <SolanaProvider>
              <LiFiPrivyWrapper
                onSwapComplete={handleSwapComplete}
                onSwapReceiptDismiss={handleSwapReceiptDismiss}
                tokens={tokens}
              />
            </SolanaProvider>
          </div>
        </CustomModal>
      )}
    </>
  );
}
