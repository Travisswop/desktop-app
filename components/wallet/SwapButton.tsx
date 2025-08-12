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

  // Clean up URL params when modal closes - FIXED to use isOpen
  useEffect(() => {
    if (!isOpen && (inputTokenParam || outputTokenParam || amountParam)) {
      const newSearchParams = new URLSearchParams(searchParams as any);
      newSearchParams.delete("inputToken");
      newSearchParams.delete("outputToken");
      newSearchParams.delete("amount");
      router.replace(`${pathname}?${newSearchParams.toString()}`);
    }
  }, [
    isOpen, // Changed from openSwapModal to isOpen
    pathname,
    router,
    searchParams,
    inputTokenParam,
    outputTokenParam,
    amountParam,
  ]);

  // Privy modal handler - This is the key fix!
  useEffect(() => {
    if (!isOpen) return;

    // Function to handle events when Privy modal is active
    const handleGlobalInteraction = (e: Event) => {
      const target = e.target as HTMLElement;

      // If the interaction is within privy-modal-content, allow it completely
      if (target && target.closest("#privy-modal-content")) {
        // Stop the event from reaching NextUI modal handlers
        e.stopPropagation();

        // For input events, ensure they work normally
        if (e.type === "input" || e.type === "keydown" || e.type === "focus") {
          // Allow the event to proceed normally for Privy inputs
          return;
        }

        // For click events within Privy modal, allow them
        if (e.type === "click" || e.type === "mousedown") {
          return;
        }
      }
    };

    // Add event listeners with capture: true to intercept early
    const eventTypes = [
      "click",
      "mousedown",
      "keydown",
      "input",
      "focus",
      "blur",
    ];
    eventTypes.forEach((eventType) => {
      document.addEventListener(eventType, handleGlobalInteraction, {
        capture: true,
        passive: false,
      });
    });

    // Monitor DOM for Privy modal and adjust z-index
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          const privyModal = document.getElementById("privy-modal-content");
          if (privyModal) {
            // Ensure Privy modal has the highest z-index
            const privyParent = privyModal.closest(
              '[role="dialog"]'
            ) as HTMLElement;
            if (privyParent) {
              privyParent.style.zIndex = "999999";
              privyParent.style.position = "fixed";
            }

            privyModal.style.zIndex = "999999";
            privyModal.style.position = "relative";

            // Also handle any backdrop/overlay
            const privyOverlay = privyModal.parentElement?.querySelector(
              '[class*="overlay"], [class*="backdrop"]'
            ) as HTMLElement;
            if (privyOverlay) {
              privyOverlay.style.zIndex = "999998";
            }

            console.log("Privy modal detected and z-index adjusted");
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      // Cleanup event listeners
      eventTypes.forEach((eventType) => {
        document.removeEventListener(eventType, handleGlobalInteraction, {
          capture: true,
        } as any);
      });
      observer.disconnect();
    };
  }, [isOpen]);

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
    // Close modal on successful swap - FIXED to use onClose
    onClose();

    if (onTokenRefresh) {
      onTokenRefresh();
    }
  };

  // Custom onOpenChange to prevent auto-closing
  const handleOpenChange = (open: boolean) => {
    // Only allow closing, not opening through backdrop/esc
    if (!open) {
      // Don't auto close - only allow manual close via button
      return;
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

      <Modal
        isDismissable={false}
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        hideCloseButton
        size="2xl"
        classNames={{
          wrapper: "z-[50000]", // Lower than Privy
          backdrop: "z-[49999]",
        }}
        closeButton={<></>}
        backdrop="blur"
        scrollBehavior="inside"
        portalContainer={document.body}
      >
        <ModalContent
          onClick={(e) => {
            // Only stop propagation if not clicking on Privy content
            const target = e.target as HTMLElement;
            if (!target.closest("#privy-modal-content")) {
              e.stopPropagation();
            }
          }}
        >
          {(onClose) => (
            <>
              <div className="sr-only">Token Swap</div>
              <div className="sr-only">
                Swap tokens between chains using LiFi protocol
              </div>

              <button
                onClick={() => onClose()}
                className="absolute top-3 right-3 z-10 rounded-md p-1 hover:bg-gray-100 focus:outline-none transition-colors"
                type="button"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
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
    </>
  );
}
