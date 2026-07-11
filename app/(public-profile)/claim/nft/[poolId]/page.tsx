import type { Metadata } from "next";
import NftBlinkClaimClient from "./NftBlinkClaimClient";

export const metadata: Metadata = {
  title: "Claim NFT Blink | Swop",
  description: "Claim this NFT reward on Swop.",
};

export default async function NftBlinkClaimPage({ params }: { params: Promise<{ poolId: string }> }) {
  const { poolId } = await params;
  return <NftBlinkClaimClient poolId={poolId} />;
}
