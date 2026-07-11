"use client";

import { FC, useMemo, useState } from "react";
import { HandCoins, Loader2 } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import toast from "react-hot-toast";
import CheckoutPaymentClient from "@/app/(public-profile)/checkout/[intentId]/CheckoutPaymentClient";
import QueryProvider from "@/components/provider/QueryProvider";
import { createTipCheckoutIntent } from "@/lib/checkout-api";
import { useUser } from "@/lib/UserContext";

export interface TipJarConfig {
  title?: string;
  note?: string;
  buttonText?: string;
  presets?: number[];
  allowCustom?: boolean;
  currency?: "USDC" | "SOL" | "pUSD";
  primaryColor?: string;
}

interface Props {
  widgetId?: string;
  config: TipJarConfig;
  /**
   * builder: static preview, clicks bubble up to open the edit modal.
   * public: pills + Tip button are live.
   */
  mode: "builder" | "public";
  micrositeId?: string;
  parentId?: string;
  fontColor?: string;
  secondaryFontColor?: string;
}

const DEFAULT_PRESETS = [1, 5, 10];

const TipJarCard: FC<Props> = ({
  widgetId,
  config,
  mode,
  micrositeId,
}) => {
  const { login } = usePrivy();
  const { accessToken } = useUser();
  const presets = useMemo(() => {
    const list = Array.isArray(config?.presets)
      ? config.presets
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
          .slice(0, 3)
      : [];
    return list.length > 0 ? list : DEFAULT_PRESETS;
  }, [config?.presets]);

  const [selectedAmount, setSelectedAmount] = useState<number>(
    presets[Math.min(1, presets.length - 1)],
  );
  const [customAmount, setCustomAmount] = useState("");
  const [checkoutIntentId, setCheckoutIntentId] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const currency = "USDC";
  const primaryColor = config?.primaryColor || "#e8734a";
  const isPublic = mode === "public";

  const effectiveAmount = (() => {
    const custom = Number(customAmount);
    if (customAmount && Number.isFinite(custom) && custom > 0) {
      return custom;
    }
    return selectedAmount;
  })();

  const handleTip = async () => {
    if (!isPublic || checkoutLoading) return;
    if (!accessToken) {
      login();
      return;
    }
    if (!widgetId || !micrositeId || effectiveAmount <= 0) {
      toast.error("This Tip Jar isn't ready yet.");
      return;
    }

    setCheckoutLoading(true);
    try {
      const intent = await createTipCheckoutIntent(
        {
          widgetId,
          micrositeId,
          amount: effectiveAmount,
          checkoutBaseUrl:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
        accessToken,
      );
      setCheckoutIntentId(intent.intentId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Tip checkout could not be opened.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <>
    <div className="my-2 w-full rounded-[22px] border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
      <div className="flex flex-col items-center text-center">
        <div
          className="flex h-[68px] w-[68px] items-center justify-center rounded-full"
          style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}
        >
          <HandCoins size={32} strokeWidth={1.7} />
        </div>
        <p className="mt-3 text-[21px] font-extrabold tracking-tight text-gray-950">
          {config?.title || "Drop a tip 🙌"}
        </p>
        <p className="mt-1 text-[13px] text-gray-500">
          {config?.note || "Pick an amount and send instantly."}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {presets.map((amount) => {
          const isActive = !customAmount && selectedAmount === amount;
          return (
            <button
              key={amount}
              type="button"
              disabled={!isPublic}
              onClick={(event) => {
                if (!isPublic) return;
                event.stopPropagation();
                setSelectedAmount(amount);
                setCustomAmount("");
              }}
              className="rounded-[16px] border bg-white py-4 text-[20px] font-extrabold transition"
              style={
                isActive
                  ? { borderColor: primaryColor, backgroundColor: `${primaryColor}12`, color: primaryColor }
                  : { borderColor: "rgba(10,10,12,.08)", color: "#0a0a0c" }
              }
            >
              ${amount}
            </button>
          );
        })}
        <label
          className="flex min-w-0 items-center rounded-[16px] border bg-white px-4"
          style={
            customAmount
              ? { borderColor: primaryColor, backgroundColor: `${primaryColor}12`, color: primaryColor }
              : { borderColor: "rgba(10,10,12,.08)", color: "#8a8a8f" }
          }
        >
          <span className="text-[20px] font-extrabold">$</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={customAmount}
            disabled={!isPublic}
            onClick={(event) => event.stopPropagation()}
            onFocus={() => setCustomAmount((value) => value || "")}
            onChange={(event) => setCustomAmount(event.target.value)}
            placeholder="Custom"
            className="min-w-0 flex-1 bg-transparent pl-1 text-[16px] font-extrabold outline-none placeholder:text-gray-400"
          />
        </label>
      </div>

      {isPublic ? (
        <>
          <button
            type="button"
            disabled={checkoutLoading}
            onClick={(event) => {
              event.stopPropagation();
              handleTip();
            }}
            className="mt-4 w-full rounded-[15px] py-3.5 text-[14px] font-bold text-white transition disabled:cursor-wait disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {checkoutLoading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : (
              <>{config?.buttonText || "Tip"} ${effectiveAmount} in {currency}</>
            )}
          </button>
        </>
      ) : (
        <div
          className="mt-4 w-full rounded-[15px] py-3 text-center text-[13px] font-bold text-white"
          style={{ backgroundColor: primaryColor }}
        >
          {config?.buttonText || "Tip"} ${effectiveAmount} in {currency}
        </div>
      )}
    </div>
    {checkoutIntentId && (
      <div className="fixed inset-0 z-[1000]" onClick={(event) => event.stopPropagation()}>
        <QueryProvider>
          <CheckoutPaymentClient
            intentId={checkoutIntentId}
            initialScanMethod="swop"
            onClose={() => setCheckoutIntentId("")}
          />
        </QueryProvider>
      </div>
    )}
    </>
  );
};

export default TipJarCard;
