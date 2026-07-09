"use client";
import React, { useEffect, useState } from "react";
import { Tooltip } from "@nextui-org/react";
import { MdInfoOutline } from "react-icons/md";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { handleCreateWidget } from "@/actions/widget";
import TipJarCard from "@/components/publicProfile/widgets/TipJarCard";

const CURRENCIES = ["USDC", "SOL", "pUSD"] as const;
const MAX_PRESETS = 6;

const parsePresets = (raw: string): number[] =>
  raw
    .split(/[,\s]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .slice(0, MAX_PRESETS);

const AddTipJar = ({ onCloseModal }: any) => {
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    const token = Cookies.get("access-token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  const state: any = useSmartSiteApiDataStore((state) => state);

  const [title, setTitle] = useState("Tip Jar");
  const [note, setNote] = useState("");
  const [buttonText, setButtonText] = useState("Send a tip");
  const [presetsInput, setPresetsInput] = useState("1, 5, 10");
  const [allowCustom, setAllowCustom] = useState(true);
  const [currency, setCurrency] =
    useState<(typeof CURRENCIES)[number]>("USDC");
  const [isLoading, setIsLoading] = useState(false);

  const presets = parsePresets(presetsInput);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (presets.length === 0) {
      toast.error("Add at least one preset amount");
      return;
    }

    setIsLoading(true);
    try {
      const data = await handleCreateWidget(
        {
          micrositeId: state._id,
          widgetType: "tipJar",
          config: {
            title: title.trim() || undefined,
            note: note.trim() || undefined,
            buttonText: buttonText.trim() || undefined,
            presets,
            allowCustom,
            currency,
          },
        },
        accessToken,
      );

      if (data?.state === "success") {
        toast.success("Tip Jar added");
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
          Tip Jar
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                Visitors pick a preset amount (or type their own) and tip you
                through your Swop Pay flow.
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
        <div className="w-full rounded-xl bg-gray-200 p-3">
          <TipJarCard
            mode="builder"
            config={{
              title,
              note,
              buttonText,
              presets: presets.length > 0 ? presets : [1],
              allowCustom,
              currency,
            }}
          />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <p className="font-medium mb-1">Title</p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="Tip Jar"
            />
          </div>
          <div>
            <p className="font-medium mb-1">Note</p>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="Support my work"
            />
          </div>
          <div>
            <p className="font-medium mb-1">Button Text</p>
            <input
              type="text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="Send a tip"
            />
          </div>
          <div>
            <p className="font-medium mb-1">
              Preset Amounts{" "}
              <span className="text-xs font-normal text-gray-400">
                (up to {MAX_PRESETS}, comma separated)
              </span>
            </p>
            <input
              type="text"
              value={presetsInput}
              onChange={(e) => setPresetsInput(e.target.value)}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="1, 5, 10"
              required
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={allowCustom}
                onChange={(e) => setAllowCustom(e.target.checked)}
                className="h-4 w-4 accent-black"
              />
              Allow custom amount
            </label>
            <div className="flex items-center gap-2">
              <p className="font-medium">Currency</p>
              <select
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as (typeof CURRENCIES)[number])
                }
                className="border border-[#ede8e8] rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-100 focus:outline-none"
              >
                {CURRENCIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
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

export default AddTipJar;
