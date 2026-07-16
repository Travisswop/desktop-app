"use client";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { FileText, Loader, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { usePrivy } from "@privy-io/react-auth";
import { handleCreateWidget } from "@/actions/widget";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import AiChatCard from "@/components/publicProfile/widgets/AiChatCard";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { apiFetch } from "@/lib/api/apiFetch";
import { buildSwopApiUrl } from "@/lib/api/apiBaseUrl";
import { type RedemptionPool, fromTokenLamports } from "@/components/wallet/redeem/token-list";

// One row in the "Attach a Blink" picker. Options come from two sources with
// different shapes: wallet Blinks (redemption pools) and the microsite's
// legacy redeemLink mint templates.
type BlinkOption = { id: string; name: string; type: "NFT" | "Token"; imageUrl?: string; link?: string };

const poolIsOpen = (pool: RedemptionPool) => !(pool.expires_at && new Date(pool.expires_at) < new Date()) && !(pool.total_amount > 0 && pool.remaining_amount <= 0);
const formatTokenAmount = (amount: number, symbol: string) => `${amount.toLocaleString("en-US", { maximumFractionDigits: amount >= 1 ? 2 : 4 })} ${symbol}`;

export default function AddAiChat({ onCloseModal }: { onCloseModal: () => void }) {
  const site: any = useSmartSiteApiDataStore((state) => state); const [token, setToken] = useState(""); const [name, setName] = useState("SmartSite Concierge"); const [personality, setPersonality] = useState("Friendly, concise, and helpful."); const [documents, setDocuments] = useState<any[]>([]); const [starters, setStarters] = useState(["What can you help me with?", "Tell me about this project", "How do I get started?"]); const [blinkId, setBlinkId] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => setToken(Cookies.get("access-token") || ""), []);
  const { user } = usePrivy(); const [pools, setPools] = useState<RedemptionPool[]>([]); const [poolsLoading, setPoolsLoading] = useState(true);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => { try { const response = await apiFetch(buildSwopApiUrl(`/api/v2/desktop/wallet/getRedeemPoolList/${user.id}`)); if (!response.ok) return; const { data } = await response.json(); if (!cancelled) setPools((data || []).map((pool: RedemptionPool) => ({ ...pool, total_amount: fromTokenLamports(pool.total_amount, pool.token_decimals), remaining_amount: fromTokenLamports(pool.remaining_amount, pool.token_decimals), tokens_per_wallet: fromTokenLamports(pool.tokens_per_wallet, pool.token_decimals), redeemLink: `https://redeem.swopme.app/${pool.pool_id}` }))); } catch (error) { console.error("Error fetching blinks:", error); } finally { if (!cancelled) setPoolsLoading(false); } })();
    return () => { cancelled = true; };
  }, [user?.id]);
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => { const files = Array.from(event.target.files || []); const added = await Promise.all(files.map(async (file, index) => { if (!file.name.toLowerCase().endsWith(".md")) throw new Error("Only .md files are supported"); const content = await file.text(); if (content.length > 50000) throw new Error(`${file.name} is too large`); return { id: `doc-${documents.length + index + 1}`, name: file.name, content, status: "training" }; })); setDocuments((current) => [...current, ...added].slice(0, 10)); };
  // Wallet Blinks (redemption pools — what the Blinks dashboard creates) are the
  // primary source; the microsite's legacy redeemLink mint templates are kept
  // for older sites. They live in different collections, so list both.
  const walletBlinks: BlinkOption[] = pools.filter(poolIsOpen).map((pool) => ({ id: pool.pool_id, name: formatTokenAmount(pool.tokens_per_wallet, pool.token_symbol), type: "Token", imageUrl: pool.token_logo, link: pool.redeemLink }));
  const legacyBlinks: BlinkOption[] = (site.info?.redeemLink ?? []).map((item: any) => ({ id: item._id || "", name: item.mintName || item.name || "Blink", type: item.tokenType === "Token" ? "Token" : "NFT", imageUrl: item.imageUrl, link: item.link }));
  const blinks = [...walletBlinks, ...legacyBlinks];
  const blink = blinks.find((item) => item.id === blinkId); const config = { name, personality, documents, starters: starters.filter(Boolean), blink: blink ? { id: blink.id, name: blink.name, type: blink.type, imageUrl: blink.imageUrl, link: blink.link } : null };
  const save = async () => { setSaving(true); try { const result = await handleCreateWidget({ micrositeId: site._id, widgetType: "aiChat", config }, token); if (result?.state !== "success") throw new Error(result?.message); toast.success("Chat added"); onCloseModal(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add Chat"); } finally { setSaving(false); } };
  const input = "w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none";
  return <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2"><div className="flex flex-col gap-4"><h2 className="text-xl font-bold">AI Chat</h2><label className="text-xs font-bold text-gray-500">Name<input className={`${input} mt-1`} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="text-xs font-bold text-gray-500">Personality<textarea className={`${input} mt-1 min-h-20`} value={personality} onChange={(event) => setPersonality(event.target.value)} /></label><div><div className="flex items-center justify-between"><p className="text-xs font-bold text-gray-500">Knowledge base</p><label className="cursor-pointer rounded-full bg-gray-950 px-3 py-1.5 text-xs font-bold text-white"><Plus size={13} className="inline" /> Add .md<input type="file" accept=".md,text/markdown" multiple className="hidden" onChange={(event) => void upload(event)} /></label></div>{documents.map((doc) => <div key={doc.id} className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 p-3"><FileText size={16} /><span className="flex-1 truncate text-sm font-semibold">{doc.name}</span><span className="text-xs text-amber-700">Training · save to finish</span><button onClick={() => setDocuments((current) => current.filter((item) => item.id !== doc.id))}><Trash2 size={15} /></button></div>)}</div><p className="text-xs font-bold text-gray-500">Starter questions</p>{starters.map((starter, index) => <input key={index} className={input} value={starter} onChange={(event) => setStarters((current) => current.map((item, i) => i === index ? event.target.value : item))} />)}<label className="text-xs font-bold text-gray-500">Attach a Blink<select className={`${input} mt-1`} value={blinkId} onChange={(event) => setBlinkId(event.target.value)}><option value="">None</option>{blinks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}{!blinks.length && <option value="" disabled>{poolsLoading ? "Loading your Blinks…" : "No Blinks yet — create one from your Wallet"}</option>}</select></label><PrimaryButton onClick={save} disabled={saving}>{saving ? <Loader className="mx-auto h-5 w-5 animate-spin" /> : "Save Chat"}</PrimaryButton></div><div className="flex flex-col gap-3"><div className="rounded-xl border border-black/10 bg-gray-50 p-3"><p className="text-sm font-bold">Preview only</p><p className="text-xs text-gray-500">Save Chat before testing real AI responses.</p></div><AiChatCard config={config} mode="builder" /></div></div>;
}
