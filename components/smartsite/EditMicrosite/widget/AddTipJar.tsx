"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import { handleCreateWidget } from "@/actions/widget";
import TipJarCard from "@/components/publicProfile/widgets/TipJarCard";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";

const SWATCHES = ["#e8734a", "#2a6fdb", "#1f8a5b", "#7c3aed", "#0a0a0c"];

const AddTipJar = ({ onCloseModal }: { onCloseModal: () => void }) => {
  const smartsite: any = useSmartSiteApiDataStore((state) => state);
  const [token, setToken] = useState("");
  const [amounts, setAmounts] = useState([3, 5, 10]);
  const [primaryColor, setPrimaryColor] = useState(SWATCHES[0]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => setToken(Cookies.get("access-token") || ""), []);

  const setAmount = (index: number, raw: string) => {
    const amount = Math.min(10000, Math.max(1, Number(raw.replace(/[^0-9.]/g, "")) || 1));
    setAmounts((current) => current.map((value, i) => (i === index ? amount : value)));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await handleCreateWidget(
        {
          micrositeId: smartsite._id,
          widgetType: "tipJar",
          config: {
            title: "Drop a tip 🙌",
            note: "Pick an amount and send instantly.",
            buttonText: "Tip",
            presets: amounts,
            allowCustom: true,
            currency: "USDC",
            primaryColor,
          },
        },
        token,
      );
      if (result?.state !== "success") throw new Error(result?.message);
      toast.success("Tip Jar added");
      onCloseModal();
    } catch (error) {
      console.error(error);
      toast.error("Could not add Tip Jar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-[#0a0a0c]">Template tip jar</h2>
        <p className="mt-0.5 text-xs text-[#8a8a8f]">Set three amounts and a primary color</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[#8a8a8f]">Amount presets</p>
        <div className="grid grid-cols-2 gap-2">
          {amounts.map((amount, index) => (
            <label key={index} className="flex items-center rounded-xl border border-black/[0.08] px-3">
              <span className="font-extrabold text-[#8a8a8f]">$</span>
              <input
                aria-label={`Preset amount ${index + 1}`}
                value={amount}
                inputMode="decimal"
                onChange={(event) => setAmount(index, event.target.value)}
                className="min-w-0 flex-1 bg-transparent p-2 text-sm font-bold outline-none"
              />
            </label>
          ))}
          <div className="flex items-center justify-center rounded-xl border border-dashed border-black/10 px-3 py-3 text-xs font-bold text-[#8a8a8f]">
            Custom (fixed)
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[#8a8a8f]">Primary color</p>
        <div className="flex flex-wrap gap-3">
          {SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use ${color}`}
              onClick={() => setPrimaryColor(color)}
              className="h-9 w-9 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(10,10,12,.12)]"
              style={{ backgroundColor: color, outline: primaryColor === color ? "2px solid #0a0a0c" : "none", outlineOffset: 2 }}
            />
          ))}
          <label className="relative h-9 w-9 overflow-hidden rounded-full border border-black/10 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]">
            <span className="sr-only">Custom color</span>
            <input
              type="color"
              value={primaryColor}
              onChange={(event) => setPrimaryColor(event.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[#8a8a8f]">Compact live preview</p>
        <div className="rounded-2xl bg-[#f4f4f5] p-3">
          <TipJarCard mode="builder" config={{ presets: amounts, primaryColor, currency: "USDC", allowCustom: true }} />
        </div>
      </div>

      <PrimaryButton className="w-full py-3" disabled={isLoading}>
        {isLoading ? <Loader className="mx-auto h-5 w-5 animate-spin" /> : "Save Tip Jar"}
      </PrimaryButton>
    </form>
  );
};

export default AddTipJar;
