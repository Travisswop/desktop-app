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
import { Modal, ModalContent, useDisclosure } from "@nextui-org/react";

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

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  // Helper function to detect if an element is part of a Privy modal or authentication dialog
  // This fixes the issue where 2FA input fields become disabled when the modal auto-close option is updated
  const isPrivyModal = (element: HTMLElement): boolean => {
    // Check for various Privy modal selectors
    const privySelectors = [
      ".privy-modal-class",
      "[data-privy-component]",
      "[data-privy-modal]",
      ".privy-modal",
      ".privy-auth-modal",
      ".privy-2fa-modal",
      ".privy-authenticator",
      '[role="dialog"]',
      '[aria-modal="true"]',
      ".modal",
      '[class*="privy"]',
      '[class*="modal"]',
      '[class*="auth"]',
      '[class*="authenticator"]',
      '[class*="2fa"]',
      '[class*="otp"]',
      '[class*="verification"]',
      '[class*="login"]',
      '[class*="signup"]',
      // Additional selectors for better coverage
      '[class*="verification-code"]',
      '[class*="email-verification"]',
      '[class*="phone-verification"]',
      '[class*="totp"]',
      '[class*="mfa"]',
      '[class*="two-factor"]',
      '[class*="security-code"]',
      '[class*="confirmation-code"]',
      // Privy-specific selectors based on the actual HTML structure
      "#privy-modal-content",
      '[id*="privy"]',
      '[class*="ContentWrapper"]',
      '[class*="BaseModal"]',
      '[class*="StyledHeader"]',
      '[class*="Title"]',
      '[class*="Subtitle"]',
      '[class*="PinInputContainer"]',
      '[class*="InputHelp"]',
      '[class*="Button"]',
      '[class*="StyledButton"]',
      '[class*="ModalFooter"]',
      // Check for Privy's specific class patterns (sc-* classes)
      '[class*="sc-"]',
      // Check for elements with numeric input patterns (2FA fields)
      'input[inputmode="numeric"]',
      'input[pattern="[0-9]"]',
      'input[autocomplete="off"]',
    ];

    const isModal = privySelectors.some((selector) =>
      element.closest(selector)
    );

    // Also check if the element is an input field or form element that might be part of authentication
    const isAuthInput =
      element.tagName === "INPUT" ||
      element.tagName === "TEXTAREA" ||
      element.tagName === "SELECT" ||
      element.tagName === "FORM" ||
      !!element.closest("form") ||
      !!element.closest("input") ||
      !!element.closest("textarea") ||
      !!element.closest("select");

    // Additional check for Privy's specific modal structure
    const isPrivyModalStructure =
      element.id === "privy-modal-content" ||
      element.closest("#privy-modal-content") ||
      element.closest('[id*="privy"]') ||
      element.closest('[class*="sc-"][class*="Modal"]') ||
      element.closest('[class*="sc-"][class*="Content"]') ||
      element.closest('[class*="sc-"][class*="Wrapper"]');

    // Specific check for 2FA input fields and verification elements
    const is2FAElement =
      element.tagName === "INPUT" &&
      (element.getAttribute("inputmode") === "numeric" ||
        element.getAttribute("pattern") === "[0-9]" ||
        element.getAttribute("autocomplete") === "off" ||
        element.getAttribute("name")?.startsWith("pin-") ||
        element.closest('[class*="PinInput"]') ||
        element.closest('[class*="verification"]') ||
        element.closest('[class*="2fa"]') ||
        element.closest('[class*="otp"]') ||
        element.closest('[class*="mfa"]'));

    // Check if element is within any Privy-related context
    const privyContextSelectors = [
      '[id*="privy"]',
      '[class*="privy"]',
      "[data-privy]",
      '[class*="sc-"][class*="Modal"]',
      '[class*="sc-"][class*="Content"]',
      '[class*="sc-"][class*="Wrapper"]',
      '[class*="sc-"][class*="Button"]',
      '[class*="sc-"][class*="Title"]',
      '[class*="sc-"][class*="Subtitle"]',
    ];

    const isInPrivyContext = privyContextSelectors.some(
      (selector) => element.closest(selector) !== null
    );

    // Debug logging when a Privy modal is detected
    if (
      isModal ||
      isAuthInput ||
      isPrivyModalStructure ||
      is2FAElement ||
      isInPrivyContext
    ) {
      console.log("Privy modal or auth input detected:", {
        element: element.tagName,
        elementId: element.id,
        elementName: element instanceof HTMLInputElement ? element.name : null,
        elementInputMode: element.getAttribute("inputmode"),
        elementPattern: element.getAttribute("pattern"),
        elementAutoComplete: element.getAttribute("autocomplete"),
        classes: element.className,
        isModal,
        isAuthInput,
        isPrivyModalStructure,
        is2FAElement,
        isInPrivyContext,
        closestSelector: isModal
          ? privySelectors.find((selector) => element.closest(selector))
          : null,
        closestPrivyId: element.closest('[id*="privy"]')?.id,
        closestScClass: element.closest('[class*="sc-"]')?.className,
        closestPinInput: element.closest('[class*="PinInput"]')?.className,
      });
    }
    return (
      isModal ||
      isAuthInput ||
      isPrivyModalStructure ||
      is2FAElement ||
      isInPrivyContext
    );
  };

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
      <WalletChartButton
        onClick={() => {
          onOpen();
        }}
      >
        <ArrowLeftRight size={16} /> Swaps
      </WalletChartButton>

      <Modal isDismissable={false} isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          {(onClose) => (
            <>
              <div className="sr-only">Token Swap</div>
              <div className="sr-only">
                Swap tokens between chains using LiFi protocol
              </div>

              <button
                onClick={() => onClose()}
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
            </>
          )}
        </ModalContent>
      </Modal>

      {/* <Dialog
        open={openSwapModal}
        onOpenChange={(open) => {
          // Prevent Radix from closing the modal except when we do it manually
          if (!open) return;
          setOpenSwapModal(open);
        }}
      >
        <DialogContent
          className="sm:max-w-[450px] md:max-w-[550px] p-0"
          // Allow interaction with Privy modals and authentication dialogs (fixes 2FA input field issue)
          onPointerDownOutside={(e) => {
            if (e.target instanceof HTMLElement && isPrivyModal(e.target)) {
              return; // This will be respected
            }
            e.preventDefault();
          }}
          onFocusOutside={(e) => {
            if (e.target instanceof HTMLElement && isPrivyModal(e.target)) {
              return; // This will be respected
            }
            e.preventDefault();
          }}
          // onEscapeKeyDown={(e) => e.preventDefault()}
          hideCloseButton
        >
          <DialogTitle className="sr-only">Token Swap</DialogTitle>
          <DialogDescription className="sr-only">
            Swap tokens between chains using LiFi protocol
          </DialogDescription>

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
      </Dialog> */}
    </>
  );
}
