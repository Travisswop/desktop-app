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

  // Privy modal handler - CSS-based solution
  useEffect(() => {
    if (!isOpen) return;

    // Add global CSS to allow interactions with Privy elements
    const style = document.createElement("style");
    style.id = "privy-modal-fix";
    style.textContent = `
      /* Allow pointer events on all Privy modal elements */
      #privy-modal-content,
      #privy-modal-content *,
      [class*="Container-sc-"],
      [class*="PinInputContainer-sc-"],
      [class*="InputHelp-sc-"],
      [class*="SubTitle-sc-"],
      input[name^="pin-"],
      input[inputmode="numeric"] {
        pointer-events: auto !important;
        z-index: 999999 !important;
        position: relative !important;
      }
      
      /* Ensure Privy modal container is on top */
      [role="dialog"][style*="z-index"] {
        z-index: 999999 !important;
      }
      
      /* Make sure backdrop doesn't interfere */
      .z-\\[999\\] {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    // Simple observer to boost Privy elements
    const observer = new MutationObserver(() => {
      const privyModal = document.getElementById("privy-modal-content");
      if (privyModal) {
        // Boost all Privy-related elements
        const elements = [
          privyModal,
          ...Array.from(privyModal.querySelectorAll("*")),
          privyModal.closest('[role="dialog"]'),
          ...Array.from(document.querySelectorAll('[class*="Container-sc-"]')),
          ...Array.from(
            document.querySelectorAll('[class*="PinInputContainer-sc-"]')
          ),
          ...Array.from(document.querySelectorAll('input[name^="pin-"]')),
          ...Array.from(
            document.querySelectorAll('input[inputmode="numeric"]')
          ),
        ].filter(Boolean) as HTMLElement[];

        elements.forEach((element) => {
          if (element) {
            element.style.zIndex = "999999";
            element.style.pointerEvents = "auto";
            element.style.position = "relative";
          }
        });

        // Specifically handle the PIN inputs
        const pinInputs = document.querySelectorAll('input[name^="pin-"]');
        pinInputs.forEach((input) => {
          const inputEl = input as HTMLInputElement;
          inputEl.style.pointerEvents = "auto";
          inputEl.style.zIndex = "999999";
          inputEl.style.position = "relative";
          inputEl.disabled = false;
          inputEl.readOnly = false;
        });

        console.log("Privy PIN inputs enabled:", pinInputs.length);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "disabled", "readonly"],
    });

    return () => {
      observer.disconnect();
      // Remove the CSS fix
      const styleEl = document.getElementById("privy-modal-fix");
      if (styleEl) {
        styleEl.remove();
      }
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
          wrapper: "z-[1000]", // Much lower z-index
          backdrop: "z-[999] pointer-events-none", // KEY: pointer-events-none on backdrop
        }}
        closeButton={<></>}
        backdrop="opaque" // Change from blur to opaque
        scrollBehavior="inside"
        portalContainer={document.body}
        // KEY FIX: Allow pointer events to pass through to higher z-index elements
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
            },
            exit: {
              y: -20,
              opacity: 0,
            },
          },
        }}
      >
        <ModalContent>
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
