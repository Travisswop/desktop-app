"use client";

import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import Redeem from "@/components/publicProfile/redeem";
import { useUser } from "@/lib/UserContext";

type BlinkStatus = {
  name?: string;
  description?: string;
  imageUrl?: string;
  limit: number;
  amountEach: number;
  symbol?: string;
  poolId: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function NftBlinkClaimClient({ poolId }: { poolId: string }) {
  const { accessToken } = useUser();
  const [blink, setBlink] = useState<BlinkStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(API_URL + "/api/v5/microsite/blink/nft/" + encodeURIComponent(poolId) + "/status", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.data) throw new Error(body?.message || "Blink not found");
        setBlink(body.data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Blink not found"));
  }, [poolId]);

  return (
    <main className="min-h-screen bg-[#f5f5f3] px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-gray-500">Swop Blink</p>
          <h1 className="mt-2 text-3xl font-black">Claim your reward</h1>
        </div>
        {!blink && !error ? <div className="grid min-h-64 place-items-center"><Loader className="animate-spin" /></div> : null}
        {error ? <div className="rounded-3xl bg-white p-8 text-center font-bold text-gray-600 shadow-sm">{error}</div> : null}
        {blink ? (
          <Redeem
            data={{
              _id: poolId,
              tokenType: "NFT",
              imageUrl: blink.imageUrl || "",
              mintName: blink.name || "Claim NFT",
              mintLimit: Number(blink.limit || 0),
              amount: Number(blink.amountEach || 1),
              symbol: blink.symbol || "NFT",
              description: blink.description || "",
              poolId,
            }}
            socialType="redeemLink"
            number={0}
            accessToken={accessToken || ""}
          />
        ) : null}
      </div>
    </main>
  );
}
