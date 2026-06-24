"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Phone,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useWallets } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import coinbaseImg from "@/public/images/coinbase.png";
import { useUser } from "@/lib/UserContext";
import WalletService, {
  CoinbaseOnrampNetwork,
} from "@/services/wallet-service";

type FundingOption = {
  network: CoinbaseOnrampNetwork;
  label: string;
  description: string;
  walletType: "evm" | "solana";
};

type OnrampMode = "embedded" | "hosted";

const FUNDING_OPTIONS: FundingOption[] = [
  {
    network: "ethereum",
    label: "Ethereum USDC",
    description: "Ethereum mainnet USDC",
    walletType: "evm",
  },
  {
    network: "polygon",
    label: "Predictions USDC",
    description: "Polygon USDC for Polymarket funding",
    walletType: "evm",
  },
  {
    network: "base",
    label: "Base USDC",
    description: "Base network USDC",
    walletType: "evm",
  },
  {
    network: "solana",
    label: "Solana USDC",
    description: "Solana wallet funding",
    walletType: "solana",
  },
  {
    network: "arbitrum",
    label: "Perps USDC",
    description: "Arbitrum USDC for Hyperliquid deposits",
    walletType: "evm",
  },
];

function truncateAddress(address?: string | null) {
  if (!address) return "No wallet found";
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeAmount(value: string) {
  return value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
}

function normalizePhoneInput(value: string) {
  return value.replace(/[^\d+()\-\s.]/g, "");
}

// Mirror of the backend's normalizeUsPhoneNumber: Coinbase guest checkout only
// accepts strict US E.164 (+1XXXXXXXXXX). Gate the button on the same rule the
// server enforces so users don't get a 400 round-trip after clicking.
function toUsE164(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  if (digits[0] === "0" || digits[0] === "1") return null;
  return `+1${digits}`;
}

function normalizeNetwork(value?: CoinbaseOnrampNetwork): CoinbaseOnrampNetwork {
  return value && FUNDING_OPTIONS.some((option) => option.network === value)
    ? value
    : "polygon";
}

function isDomainAllowlistError(message: string) {
  return /domain.+allow[- ]?list/i.test(message);
}

function isOrdersApiAuthorizationError(message: string) {
  return /not authorized to create onramp orders/i.test(message);
}

function withCoinbaseSandboxParam(
  paymentLinkUrl: string,
  paymentMethod: string
) {
  try {
    const url = new URL(paymentLinkUrl);
    if (paymentMethod === "GUEST_CHECKOUT_GOOGLE_PAY") {
      url.searchParams.set("useGooglePaySandbox", "true");
    } else {
      url.searchParams.set("useApplePaySandbox", "true");
    }
    return url.toString();
  } catch {
    const separator = paymentLinkUrl.includes("?") ? "&" : "?";
    const param =
      paymentMethod === "GUEST_CHECKOUT_GOOGLE_PAY"
        ? "useGooglePaySandbox=true"
        : "useApplePaySandbox=true";
    return `${paymentLinkUrl}${separator}${param}`;
  }
}

type CoinbaseOnrampFundingProps = {
  initialNetwork?: CoinbaseOnrampNetwork;
  initialAmount?: string;
  variant?: "light" | "dark";
  compact?: boolean;
};

export default function CoinbaseOnrampFunding({
  initialNetwork = "polygon",
  initialAmount = "20",
  variant = "light",
  compact = false,
}: CoinbaseOnrampFundingProps) {
  const { user, accessToken } = useUser();
  const { wallets: evmWallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const [selectedNetwork, setSelectedNetwork] =
    useState<CoinbaseOnrampNetwork>(normalizeNetwork(initialNetwork));
  const [paymentAmount, setPaymentAmount] = useState(
    normalizeAmount(initialAmount) || "20"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onrampUrl, setOnrampUrl] = useState<string | null>(null);
  const [onrampMode, setOnrampMode] = useState<OnrampMode>("embedded");
  const [sessionDestinationAddress, setSessionDestinationAddress] =
    useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [onrampEvent, setOnrampEvent] = useState<string | null>(null);
  const isDark = variant === "dark";

  const evmAddress = useMemo(() => {
    const embeddedWallet =
      evmWallets?.find((wallet: any) => wallet.walletClientType === "privy") ||
      evmWallets?.[0];
    return (
      embeddedWallet?.address ||
      (user as any)?.ethereumWallet ||
      user?.ethAddress ||
      (String(user?.address || "").startsWith("0x") ? user?.address : "")
    );
  }, [evmWallets, user]);

  const solanaAddress = useMemo(() => {
    return (
      (user as any)?.solanaWallet ||
      user?.solanaAddress ||
      solanaWallets?.[0]?.address
    );
  }, [solanaWallets, user]);

  const selectedOption =
    FUNDING_OPTIONS.find((option) => option.network === selectedNetwork) ||
    FUNDING_OPTIONS[0];
  const selectedAddress =
    selectedOption.walletType === "solana" ? solanaAddress : evmAddress;
  const destinationAddress = sessionDestinationAddress || selectedAddress;

  const numericAmount = Number(paymentAmount);
  const amountValid = Number.isFinite(numericAmount) && numericAmount > 0;
  // Guest checkout requires a valid US phone in strict E.164 — match the server.
  const phoneValid = toUsE164(phoneNumber) !== null;
  const canStart = Boolean(accessToken && amountValid && phoneValid);

  const handleSelectNetwork = (network: CoinbaseOnrampNetwork) => {
    setSelectedNetwork(network);
    setOnrampUrl(null);
    setOnrampMode("embedded");
    setSessionDestinationAddress(null);
    setOnrampEvent(null);
    setError(null);
  };

  const handleStartOnramp = async () => {
    if (!canStart) return;

    setIsLoading(true);
    setError(null);
    setOnrampUrl(null);
    setOnrampMode("embedded");
    setSessionDestinationAddress(null);
    setOnrampEvent(null);

    try {
      const agreementAcceptedAt = new Date().toISOString();
      const order = await WalletService.createCoinbaseOnrampOrder(
        {
          network: selectedNetwork,
          purchaseCurrency: "USDC",
          paymentCurrency: "USD",
          paymentAmount,
          paymentMethod: "GUEST_CHECKOUT_APPLE_PAY",
          phoneNumber,
          phoneNumberVerifiedAt: agreementAcceptedAt,
          agreementAcceptedAt,
          domain:
            typeof window !== "undefined"
              ? window.location.hostname
              : undefined,
        },
        accessToken
      );
      const paymentLinkUrl = order.paymentLink?.url;
      if (!paymentLinkUrl) {
        throw new Error("Coinbase did not return an embedded payment button.");
      }
      setOnrampUrl(
        order.sandbox
          ? withCoinbaseSandboxParam(paymentLinkUrl, order.paymentMethod)
          : paymentLinkUrl
      );
      setOnrampMode("embedded");
      setSessionDestinationAddress(order.destinationAddress);
    } catch (err: any) {
      const message =
        err?.message || "Unable to start embedded Coinbase funding.";

      if (isDomainAllowlistError(message)) {
        setError(
          "Coinbase blocked embedded checkout for this domain. Swop only uses embedded Headless Onramp here; enable Headless sandbox for localhost or allow-list this app domain in Coinbase Developer Platform."
        );
        return;
      }

      if (isOrdersApiAuthorizationError(message)) {
        try {
          const session = await WalletService.createCoinbaseOnrampSession(
            {
              network: selectedNetwork,
              purchaseCurrency: "USDC",
              paymentCurrency: "USD",
              paymentAmount,
              redirectUrl:
                typeof window !== "undefined"
                  ? window.location.href
                  : undefined,
            },
            accessToken
          );

          setOnrampUrl(session.onrampUrl);
          setOnrampMode("hosted");
          setSessionDestinationAddress(session.destinationAddress);
          setError(
            "Embedded Coinbase checkout is not enabled for this CDP app yet, so use the hosted Coinbase checkout to continue."
          );
          return;
        } catch (sessionErr: any) {
          setError(
            sessionErr?.message ||
              "Coinbase checkout is not enabled for this CDP app yet."
          );
          return;
        }
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!onrampUrl || typeof window === "undefined") return;

    // Only trust postMessage events coming from the exact Coinbase frame we
    // embedded — otherwise any other window could spoof a success/error event.
    let expectedOrigin: string | null = null;
    try {
      expectedOrigin = new URL(onrampUrl).origin;
    } catch {
      expectedOrigin = null;
    }

    const handleMessage = (event: MessageEvent) => {
      if (expectedOrigin && event.origin !== expectedOrigin) return;

      let payload = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }

      if (!payload?.eventName?.startsWith?.("onramp_api.")) return;
      setOnrampEvent(payload.eventName);

      const errorMessage = payload.data?.errorMessage;
      if (errorMessage) {
        setError(errorMessage);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onrampUrl]);

  if (onrampUrl) {
    const isHostedOnramp = onrampMode === "hosted";

    return (
      <div className="space-y-4">
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 ${
            isDark
              ? "border-[#3fe08f]/25 bg-[#3fe08f]/10"
              : "border-blue-100 bg-blue-50"
          }`}
        >
          <div
            className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${
              isDark ? "bg-[#0b0c0f]" : "bg-white"
            }`}
          >
            <ShieldCheck
              className={`h-5 w-5 ${
                isDark ? "text-[#3fe08f]" : "text-blue-600"
              }`}
            />
          </div>
          <div>
            <h3
              className={`font-semibold ${
                isDark ? "text-[#eceef2]" : "text-gray-950"
              }`}
            >
              {isHostedOnramp
                ? "Coinbase hosted checkout is ready"
                : "Coinbase payment is ready in Swop"}
            </h3>
            <p
              className={`text-sm ${
                isDark ? "text-[#9ca0aa]" : "text-gray-600"
              }`}
            >
              {isHostedOnramp
                ? "Continue to Coinbase to finish the purchase. "
                : "Press the Coinbase pay button below. "}
              USDC will be sent to{" "}
              {selectedOption.label} at{" "}
              {truncateAddress(destinationAddress)} when the purchase settles.
            </p>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-5 ${
            isDark
              ? "border-white/[0.08] bg-[#15171d]"
              : "border-gray-200 bg-white"
          }`}
        >
          {isHostedOnramp ? (
            <a
              href={onrampUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition ${
                isDark
                  ? "bg-[#3fe08f] text-[#031008] hover:bg-[#64f2aa]"
                  : "bg-black text-white hover:bg-gray-900"
              }`}
            >
              Continue at Coinbase
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <>
              <div
                className={`overflow-hidden rounded-2xl border ${
                  isDark
                    ? "border-white/[0.08] bg-[#0b0c0f]"
                    : "border-gray-200 bg-white"
                }`}
              >
                <iframe
                  title="Coinbase embedded onramp"
                  src={onrampUrl}
                  allow="payment"
                  // Apple/Google Pay open a payment sheet and submit forms, so the
                  // sandbox must permit popups and forms in addition to scripts.
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                  referrerPolicy="no-referrer"
                  className="h-[260px] w-full border-0 bg-transparent"
                />
              </div>
              <div
                className={`mt-3 flex items-center gap-2 rounded-xl p-3 text-sm ${
                  isDark
                    ? "border border-white/[0.08] bg-black/20 text-[#9ca0aa]"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                {onrampEvent === "onramp_api.commit_success" ||
                onrampEvent === "onramp_api.polling_success" ? (
                  <CheckCircle2 className="h-4 w-4 text-[#3fe08f]" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span>
                  {onrampEvent
                    ? onrampEvent.replace("onramp_api.", "Coinbase: ")
                    : "Waiting for Coinbase payment button"}
                </span>
              </div>
            </>
          )}
        </div>

        {error && (
          <p
            className={`rounded-xl border p-3 text-sm ${
              isDark
                ? "border-[#ff5d63]/35 bg-[#ff5d63]/10 text-[#ffb2b6]"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => {
              setOnrampUrl(null);
              setOnrampMode("embedded");
              setOnrampEvent(null);
            }}
            className={`flex-1 rounded-xl border px-4 py-3 font-semibold transition ${
              isDark
                ? "border-white/[0.08] text-[#eceef2] hover:bg-white/[0.04]"
                : "border-gray-200 text-gray-800 hover:bg-gray-50"
            }`}
          >
            Change funding details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <div className={compact ? "text-left" : "text-center"}>
        <h2
          className={`${compact ? "text-lg" : "text-2xl"} font-semibold ${
            isDark ? "text-[#eceef2]" : ""
          }`}
        >
          Fund your wallet
        </h2>
        <p
          className={`mt-2 text-sm ${
            isDark ? "text-[#9ca0aa]" : "text-gray-500"
          }`}
        >
          Buy USDC with Coinbase and send it straight to your Swop wallet.
        </p>
      </div>

      <div
        className={`rounded-2xl border p-4 ${
          isDark
            ? "border-white/[0.08] bg-[#15171d] text-[#eceef2]"
            : "border-gray-200"
        }`}
      >
        <div className="mb-3 flex items-center gap-2">
          <Image src={coinbaseImg} alt="Coinbase" className="h-6 w-6" />
          <div>
            <h3
              className={`font-semibold ${
                isDark ? "text-[#eceef2]" : "text-gray-950"
              }`}
            >
              Coinbase Onramp
            </h3>
            <p
              className={`text-xs ${
                isDark ? "text-[#6f7380]" : "text-gray-500"
              }`}
            >
              Backend validated, wallet-owned funding
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          {FUNDING_OPTIONS.map((option) => {
            const isSelected = selectedNetwork === option.network;
            const address =
              option.walletType === "solana" ? solanaAddress : evmAddress;

            return (
              <button
                key={option.network}
                onClick={() => handleSelectNetwork(option.network)}
                disabled={isLoading}
                className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isDark
                    ? isSelected
                      ? "border-[#3fe08f]/55 bg-[#3fe08f]/10"
                      : "border-white/[0.08] bg-black/20 hover:border-white/[0.16] hover:bg-white/[0.04]"
                    : isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p
                      className={`font-semibold ${
                        isDark ? "text-[#eceef2]" : "text-gray-950"
                      }`}
                    >
                      {option.label}
                    </p>
                    <p
                      className={`text-xs ${
                        isDark ? "text-[#6f7380]" : "text-gray-500"
                      }`}
                    >
                      {option.description}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isDark ? "text-[#9ca0aa]" : "text-gray-500"
                    }`}
                  >
                    {truncateAddress(address)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <label
          className={`mt-4 block text-sm font-semibold ${
            isDark ? "text-[#9ca0aa]" : "text-gray-700"
          }`}
        >
          Amount
          <div
            className={`mt-2 flex items-center rounded-xl border px-3 ${
              isDark
                ? "border-white/[0.08] bg-black text-[#eceef2]"
                : "border-gray-200 bg-white"
            }`}
          >
            <span className={isDark ? "text-[#6f7380]" : "text-gray-400"}>$</span>
            <input
              value={paymentAmount}
              onChange={(event) =>
                setPaymentAmount(normalizeAmount(event.target.value))
              }
              disabled={isLoading}
              inputMode="decimal"
              className="w-full bg-transparent px-2 py-3 text-lg font-semibold outline-none disabled:opacity-60"
              placeholder="20"
            />
            <span
              className={`text-sm font-medium ${
                isDark ? "text-[#6f7380]" : "text-gray-500"
              }`}
            >
              USD
            </span>
          </div>
        </label>

        <label
          className={`mt-4 block text-sm font-semibold ${
            isDark ? "text-[#9ca0aa]" : "text-gray-700"
          }`}
        >
          Phone number
          <div
            className={`mt-2 flex items-center rounded-xl border px-3 ${
              isDark
                ? "border-white/[0.08] bg-black text-[#eceef2]"
                : "border-gray-200 bg-white"
            }`}
          >
            <Phone
              className={`h-4 w-4 ${
                isDark ? "text-[#6f7380]" : "text-gray-400"
              }`}
            />
            <input
              value={phoneNumber}
              onChange={(event) =>
                setPhoneNumber(normalizePhoneInput(event.target.value))
              }
              disabled={isLoading}
              inputMode="tel"
              className="w-full bg-transparent px-2 py-3 text-lg font-semibold outline-none disabled:opacity-60"
              placeholder="+1 555 123 4567"
            />
          </div>
        </label>

        <div
          className={`mt-3 rounded-xl p-3 text-sm ${
            isDark
              ? "border border-white/[0.08] bg-black/20 text-[#9ca0aa]"
              : "bg-gray-50 text-gray-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span>
              Destination: {selectedOption.label} ·{" "}
              {onrampUrl && sessionDestinationAddress
                ? truncateAddress(sessionDestinationAddress)
                : selectedAddress
                ? `${truncateAddress(selectedAddress)} · backend verifies on continue`
                : "backend verifies on continue"}
            </span>
          </div>
        </div>

        <p
          className={`mt-3 text-xs ${
            isDark ? "text-[#6f7380]" : "text-gray-500"
          }`}
        >
          By clicking Buy USDC in Swop, you agree to Coinbase Guest Checkout
          terms, user agreement, and privacy policy for this funding purchase.
        </p>

        {error && (
          <p
            className={`mt-3 rounded-xl border p-3 text-sm ${
              isDark
                ? "border-[#ff5d63]/35 bg-[#ff5d63]/10 text-[#ffb2b6]"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {error}
          </p>
        )}

        <button
          onClick={handleStartOnramp}
          disabled={!canStart || isLoading}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isDark
              ? "bg-[#3fe08f] text-[#031008] hover:bg-[#64f2aa]"
              : "bg-black text-white hover:bg-gray-900"
          }`}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Buy USDC in Swop
        </button>
        {!canStart && (
          <div
            className={`mt-3 flex items-start gap-2 text-xs ${
              isDark ? "text-[#6f7380]" : "text-gray-500"
            }`}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>
              Enter an amount greater than $0 and a valid US phone number to
              render the in-app Coinbase payment button.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
