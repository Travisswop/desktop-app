"use client";

import { FC, useMemo, useState } from "react";
import { HandCoins } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface TipJarConfig {
  title?: string;
  note?: string;
  buttonText?: string;
  presets?: number[];
  allowCustom?: boolean;
  currency?: "USDC" | "SOL" | "pUSD";
}

interface Props {
  widgetId?: string;
  config: TipJarConfig;
  /**
   * builder: static preview, clicks bubble up to open the edit modal.
   * public: pills + Tip button are live.
   */
  mode: "builder" | "public";
  /**
   * The site's Swop Pay payment URL (first `info.product` item). The public
   * Tip CTA deep-links here with the chosen amount — there is no
   * visitor-initiated checkout-intent endpoint, so we reuse the same
   * mechanism PaymentBar uses (open paymentUrl) with an `amount` param.
   */
  fallbackPaymentUrl?: string | null;
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
  fallbackPaymentUrl,
  parentId,
}) => {
  const presets = useMemo(() => {
    const list = Array.isArray(config?.presets)
      ? config.presets
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
          .slice(0, 6)
      : [];
    return list.length > 0 ? list : DEFAULT_PRESETS;
  }, [config?.presets]);

  const [selectedAmount, setSelectedAmount] = useState<number>(presets[0]);
  const [customAmount, setCustomAmount] = useState("");
  const currency = config?.currency || "USDC";
  const isPublic = mode === "public";

  const effectiveAmount = (() => {
    const custom = Number(customAmount);
    if (customAmount && Number.isFinite(custom) && custom > 0) {
      return custom;
    }
    return selectedAmount;
  })();

  const payHref = useMemo(() => {
    if (!fallbackPaymentUrl) return null;
    try {
      const raw = fallbackPaymentUrl.startsWith("http")
        ? fallbackPaymentUrl
        : `https://${fallbackPaymentUrl}`;
      const url = new URL(raw);
      url.searchParams.set("amount", String(effectiveAmount));
      url.searchParams.set("currency", currency);
      return url.toString();
    } catch {
      return null;
    }
  }, [fallbackPaymentUrl, effectiveAmount, currency]);

  const handleTip = () => {
    if (!isPublic || !payHref) return;
    if (widgetId) {
      try {
        fetch(`${API_URL}/api/v1/web/updateCount`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            socialType: "widget",
            socialId: widgetId,
            parentId,
          }),
        });
      } catch (err) {
        console.log(err);
      }
    }
    window.open(payHref, "_self");
  };

  return (
    <div className="w-full my-2 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <HandCoins className="h-4.5 w-4.5" size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight text-gray-950">
            {config?.title || "Tip Jar"}
          </p>
          {config?.note && (
            <p className="truncate text-[13px] text-gray-500">{config.note}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                isActive
                  ? "border-gray-950 bg-gray-950 text-white"
                  : "border-black/[0.06] bg-white text-gray-950 hover:border-black/[0.15]"
              }`}
            >
              ${amount}
            </button>
          );
        })}
        {config?.allowCustom !== false && (
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={customAmount}
            disabled={!isPublic}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setCustomAmount(event.target.value)}
            placeholder="Custom"
            className="h-8 w-20 rounded-full border border-black/[0.06] bg-gray-50 px-3 text-[13px] font-medium text-gray-950 outline-none focus:border-black/[0.2]"
          />
        )}
      </div>

      {isPublic ? (
        <>
          <button
            type="button"
            disabled={!payHref}
            onClick={(event) => {
              event.stopPropagation();
              handleTip();
            }}
            className={`mt-3 w-full rounded-full py-2.5 text-[13px] font-semibold transition ${
              payHref
                ? "bg-gray-950 text-white hover:bg-gray-800"
                : "cursor-not-allowed bg-black/[0.04] text-gray-400"
            }`}
          >
            {config?.buttonText || "Send a tip"} · ${effectiveAmount} {currency}
          </button>
          {!payHref && (
            <p className="mt-1.5 text-center text-[11px] text-gray-400">
              Tips aren&apos;t set up yet
            </p>
          )}
        </>
      ) : (
        <div className="mt-3 w-full rounded-full bg-gray-950 py-2.5 text-center text-[13px] font-semibold text-white">
          {config?.buttonText || "Send a tip"} · ${effectiveAmount} {currency}
        </div>
      )}
    </div>
  );
};

export default TipJarCard;
