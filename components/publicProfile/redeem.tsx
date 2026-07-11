"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Check, Gift, Loader, LockKeyhole } from "lucide-react";
import toast from "react-hot-toast";
import { useUser } from "@/lib/UserContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  data: {
    _id: string;
    tokenType?: string;
    network?: string;
    imageUrl: string;
    tokenUrl?: string;
    link?: string;
    mintName: string;
    mintLimit: number;
    amount: number;
    symbol: string;
    description: string;
    poolId: string;
  };
  socialType: string;
  parentId?: string;
  number: number;
  accessToken: string;
  fontColor?: string;
  secondaryFontColor?: string;
  onClick?: () => void;
}

export default function Redeem({ data, socialType, parentId, accessToken, fontColor, secondaryFontColor, onClick }: Props) {
  const { user } = useUser();
  const [status, setStatus] = useState({ claimed: 0, left: Number(data.mintLimit || 0), limit: Number(data.mintLimit || 0) });
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const isNft = String(data.tokenType || "").toLowerCase() === "nft";

  const refresh = useCallback(async () => {
    if (onClick || !data.poolId || !API_URL) return;
    try {
      if (isNft) {
        const response = await fetch(API_URL + "/api/v5/microsite/blink/nft/" + encodeURIComponent(data.poolId) + "/status");
        const body = await response.json();
        if (response.ok && body.data) setStatus(body.data);
      } else {
        const response = await fetch(API_URL + "/api/v2/desktop/wallet/getRedeemTokenFromPool/" + encodeURIComponent(data.poolId));
        const body = await response.json();
        const claimedCount = Array.isArray(body?.data?.redeemed) ? body.data.redeemed.length : Number(body?.data?.pool?.total_redemptions || 0);
        const limit = Number(body?.data?.pool?.max_wallets || data.mintLimit || 0);
        setStatus({ claimed: claimedCount, left: Math.max(0, limit - claimedCount), limit });
      }
    } catch {
      // The stored mint limit remains a stable fallback while status refreshes.
    }
  }, [data.mintLimit, data.poolId, isNft, onClick]);

  useEffect(() => {
    void refresh();
    if (onClick) return;
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(timer);
  }, [onClick, refresh]);

  const updateCount = async () => {
    if (!API_URL || !parentId) return;
    await fetch(API_URL + "/api/v1/web/updateCount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socialType, socialId: data._id, parentId }),
    }).catch(() => undefined);
  };

  const claim = async () => {
    if (onClick) return onClick();
    if (claimed || claiming || status.left <= 0) return;
    setClaiming(true);
    try {
      if (isNft) {
        const walletUser = user as unknown as { solanaWallet?: string; solanaAddress?: string } | null;
        const walletAddress = String(walletUser?.solanaWallet || walletUser?.solanaAddress || "");
        if (!walletAddress) throw new Error("Connect a Solana wallet to claim.");
        const response = await fetch(API_URL + "/api/v5/microsite/blink/nft/" + encodeURIComponent(data.poolId) + "/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json", authorization: "Bearer " + accessToken },
          body: JSON.stringify({ walletAddress }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || "NFT claim failed");
      } else {
        window.open(data.link || "https://redeem.swopme.app/" + data.poolId, "_blank");
      }
      setClaimed(true);
      await updateCount();
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  };

  const percent = status.limit > 0 ? Math.min(100, (status.claimed / status.limit) * 100) : 0;
  return (
    <article className="overflow-hidden rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[18px] bg-gray-100">
        {data.imageUrl ? <Image src={data.imageUrl} alt={data.mintName} fill className="object-cover" /> : <div className="grid h-full place-items-center"><Gift className="text-gray-400" /></div>}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black text-gray-900 shadow-sm backdrop-blur">
          Free · Claimable {isNft ? "NFT" : "Token"}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-black" style={{ color: fontColor }}>{data.mintName || "Claim reward"}</h3>
      {data.description ? <p className="mt-1 text-sm leading-5" style={{ color: secondaryFontColor || "#6b7280" }}>{data.description}</p> : null}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gray-950 transition-all" style={{ width: String(percent) + "%" }} /></div>
      <div className="mt-2 flex justify-between text-[11px] font-bold text-gray-500"><span>{status.claimed} claimed</span><span>{status.left} left</span></div>
      <button type="button" onClick={() => void claim()} disabled={claiming || claimed || status.left <= 0} className={"mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-white transition disabled:cursor-default " + (claimed ? "bg-emerald-600" : status.left <= 0 ? "bg-gray-400" : "bg-gray-950 hover:bg-black")}>
        {claiming ? <Loader className="h-4 w-4 animate-spin" /> : claimed ? <><Check size={16} />Claimed</> : status.left <= 0 ? <><LockKeyhole size={15} />Fully claimed</> : "Claim"}
      </button>
    </article>
  );
}
