"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { Loader, Search } from "lucide-react";
import toast from "react-hot-toast";
import { handleCreateWidget } from "@/actions/widget";
import ChartPostCard from "@/components/publicProfile/widgets/ChartPostCard";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";

type Market = { coin: string; name: string; markPrice: number };

export default function AddChartPost({ onCloseModal }: { onCloseModal: () => void }) {
  const site: any = useSmartSiteApiDataStore((state) => state);
  const [token, setToken] = useState("");
  const [query, setQuery] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [market, setMarket] = useState<Market | null>(null);
  const [bias, setBias] = useState<"long" | "short">("long");
  const [entry, setEntry] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setToken(Cookies.get("access-token") || ""), []);

  const config = useMemo(() => ({
    market: market || undefined,
    bias,
    entry: Number(entry),
    takeProfit: Number(takeProfit),
    stopLoss: Number(stopLoss),
    hypothesis: hypothesis.trim(),
    postedAt: new Date().toISOString(),
  }), [bias, entry, hypothesis, market, stopLoss, takeProfit]);

  const search = async () => {
    setSearching(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/chart-markets?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Market search failed");
      const body = await response.json();
      setMarkets(body.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Market search failed");
    } finally {
      setSearching(false);
    }
  };

  const chooseMarket = (next: Market) => {
    setMarket(next);
    setEntry(String(next.markPrice));
    setTakeProfit(String(next.markPrice * 1.1));
    setStopLoss(String(next.markPrice * 0.95));
    setMarkets([]);
  };

  const save = async () => {
    if (!market || !Number(entry) || !Number(takeProfit) || !Number(stopLoss) || !hypothesis.trim()) {
      toast.error("Choose a market and complete Entry, TP, SL, and hypothesis");
      return;
    }
    setSaving(true);
    try {
      const result = await handleCreateWidget({ micrositeId: site._id, widgetType: "chartPost", config }, token);
      if (result?.state !== "success") throw new Error(result?.message || "Could not save Chart Post");
      toast.success("Chart Post added");
      onCloseModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save Chart Post");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-black/30";
  const hint = (value: string) => entry && value ? `${(((Number(value) - Number(entry)) / Number(entry)) * 100).toFixed(1)}%` : "—";

  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Chart Post</h2>
        <div className="flex gap-2">
          <input className={input} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void search()} placeholder="Search BTC, ETH, SOL…" />
          <button type="button" onClick={() => void search()} className="rounded-xl bg-black px-4 text-white">{searching ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button>
        </div>
        {markets.length > 0 && <div className="max-h-48 overflow-auto rounded-xl border border-black/10">{markets.map((item) => <button type="button" key={item.coin} onClick={() => chooseMarket(item)} className="flex w-full justify-between border-b border-black/5 px-3 py-2 text-sm last:border-0 hover:bg-gray-50"><b>{item.name}</b><span>${item.markPrice}</span></button>)}</div>}
        <div className="grid grid-cols-2 gap-2">{(["long", "short"] as const).map((item) => <button type="button" key={item} onClick={() => setBias(item)} className={`rounded-full py-2 text-xs font-black ${bias === item ? "bg-black text-white" : "bg-gray-100 text-gray-500"}`}>{item.toUpperCase()}</button>)}</div>
        <div className="grid grid-cols-3 gap-2">
          <Level label="Entry" value={entry} setValue={setEntry} input={input} />
          <Level label={`TP · ${hint(takeProfit)}`} value={takeProfit} setValue={setTakeProfit} input={input} />
          <Level label={`SL · ${hint(stopLoss)}`} value={stopLoss} setValue={setStopLoss} input={input} />
        </div>
        <label className="text-xs font-bold text-gray-500">Hypothesis<textarea className={`${input} mt-1 min-h-28`} value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} placeholder="Why do you expect this move?" /></label>
        <PrimaryButton onClick={() => void save()} disabled={saving}>{saving ? <Loader className="mx-auto h-5 w-5 animate-spin" /> : "Save Chart Post"}</PrimaryButton>
      </div>
      <ChartPostCard config={config} mode="builder" />
    </div>
  );
}

function Level({ label, value, setValue, input }: { label: string; value: string; setValue: (value: string) => void; input: string }) {
  return <label className="text-[10px] font-bold text-gray-500">{label}<input type="number" inputMode="decimal" className={`${input} mt-1`} value={value} onChange={(event) => setValue(event.target.value)} placeholder="0.00" /></label>;
}
