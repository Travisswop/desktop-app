"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Tooltip } from "@nextui-org/react";
import { MdInfoOutline } from "react-icons/md";
import { IoLinkOutline } from "react-icons/io5";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { handleCreateWidget } from "@/actions/widget";
import PredictionMarketCard, {
  PredictionMarketConfig,
} from "@/components/publicProfile/widgets/PredictionMarketCard";

/**
 * Turn whatever the user pastes into a market reference the backend accepts:
 * - 0x…64-hex → conditionId
 * - digits → marketId
 * - polymarket.com URL → last path segment as slug (plus eventSlug when the
 *   URL is /event/<event>/<market>)
 * - anything else → treated as a slug
 */
export const parsePolymarketRef = (
  raw: string,
): Partial<PredictionMarketConfig> | null => {
  const value = raw.trim();
  if (!value) return null;
  if (/^0x[a-f0-9]{64}$/i.test(value)) return { conditionId: value };
  if (/^\d+$/.test(value)) return { marketId: value };

  if (value.includes("polymarket.com")) {
    try {
      const url = new URL(value.startsWith("http") ? value : `https://${value}`);
      const segments = url.pathname.split("/").filter(Boolean);
      const last = segments[segments.length - 1];
      if (!last || last === "event" || last === "market") return null;
      const parsed: Partial<PredictionMarketConfig> = { slug: last };
      if (segments[0] === "event" && segments.length >= 2) {
        parsed.eventSlug = segments[1];
      }
      return parsed;
    } catch {
      return null;
    }
  }

  return { slug: value };
};

const AddPredictionMarket = ({ onCloseModal }: any) => {
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    const token = Cookies.get("access-token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  const state: any = useSmartSiteApiDataStore((state) => state);

  const [marketInput, setMarketInput] = useState("");
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const parsedRef = useMemo(
    () => parsePolymarketRef(marketInput),
    [marketInput],
  );

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!parsedRef) {
      toast.error("Paste a Polymarket link, slug, or condition id");
      return;
    }

    setIsLoading(true);
    try {
      const data = await handleCreateWidget(
        {
          micrositeId: state._id,
          widgetType: "predictionMarket",
          config: {
            ...parsedRef,
            question: question.trim() || undefined,
          },
        },
        accessToken,
      );

      if (data?.state === "success") {
        toast.success("Prediction market pinned");
        onCloseModal();
      } else {
        toast.error("Something went wrong");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex items-end gap-1 justify-center">
        <h2 className="font-semibold text-gray-700 text-xl text-center">
          Prediction Market
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                Pin a live Polymarket market to your page. Paste the market
                link (or its slug / condition id) — odds update automatically.
              </span>
            }
            className="max-w-40 h-auto"
          >
            <button>
              <MdInfoOutline />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:px-10 2xl:px-[10%]">
        {parsedRef && (
          <div className="w-full rounded-xl bg-gray-200 p-3">
            <PredictionMarketCard
              mode="builder"
              config={{
                ...parsedRef,
                question: question.trim() || undefined,
              }}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <p className="font-medium mb-1">Market Link or ID</p>
            <div className="relative">
              <IoLinkOutline
                className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                size={20}
              />
              <input
                type="text"
                value={marketInput}
                onChange={(e) => setMarketInput(e.target.value)}
                className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-11 py-2 text-gray-700 bg-gray-100"
                placeholder="https://polymarket.com/event/…"
                required
              />
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">
              Question Override{" "}
              <span className="text-xs font-normal text-gray-400">
                (optional)
              </span>
            </p>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="Shown while the market loads"
            />
          </div>
          <PrimaryButton className="w-full py-3">
            {isLoading ? (
              <Loader className="w-8 h-8 animate-spin mx-auto" />
            ) : (
              "Save"
            )}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
};

export default AddPredictionMarket;
