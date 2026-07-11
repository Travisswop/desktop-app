"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Loader, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { useUser } from "@/lib/UserContext";
import { useMultiChainTokenData } from "@/lib/hooks/useToken";
import { useWalletAddresses, useWalletData } from "@/components/wallet/hooks/useWalletData";
import { SUPPORTED_CHAINS } from "@/components/wallet/constants";
import { useCreateRedeemLink, type RedeemLinkToken } from "@/lib/hooks/useCreateRedeemLink";
import { createNftBlink, postRedeem } from "@/actions/redeem";
import { postFeed } from "@/actions/postFeed";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import Redeem from "@/components/publicProfile/redeem";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";

type BlinkType = "NFT" | "Token";
type NftTemplate = {
  _id: string;
  name: string;
  image?: string;
  collectionMintAddress?: string;
};
type SolanaToken = RedeemLinkToken & { balance: number };

export default function ManageBlink({ onCloseModal }: { onCloseModal: () => void }) {
  const params = useParams();
  const micrositeId = String(params?.editId || "");
  const { user: privyUser, authenticated, ready } = usePrivy();
  const { user, accessToken } = useUser();
  const walletData = useWalletData(authenticated, ready, privyUser, user);
  const { solWalletAddress, evmWalletAddress } = useWalletAddresses(walletData);
  const { tokens: rawTokens = [], loading: tokensLoading } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddress,
    SUPPORTED_CHAINS,
  );
  const solTokens = useMemo<SolanaToken[]>(() => (
    rawTokens as unknown as Array<{
      chain?: string;
      symbol?: string;
      name?: string;
      balance?: number | string;
      decimals?: number;
      isNative?: boolean;
      address?: string | null;
      logoURI?: string;
      logo?: string;
    }>
  ).filter((token) => String(token.chain || "").toUpperCase() === "SOLANA")
    .map((token) => ({
      symbol: token.symbol || "TOKEN",
      name: token.name || token.symbol || "Token",
      balance: Number(token.balance || 0),
      decimals: token.decimals ?? 9,
      isNative: Boolean(token.isNative),
      address: token.address,
      logoURI: token.logoURI,
      logo: token.logo,
    }))
    .filter((token) => token.balance > 0 || token.isNative), [rawTokens]);

  const [type, setType] = useState<BlinkType>("Token");
  const [nfts, setNfts] = useState<NftTemplate[]>([]);
  const [selectedNftId, setSelectedNftId] = useState("");
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState("");
  const [name, setName] = useState("");
  const [amountEach, setAmountEach] = useState("1");
  const [mintLimit, setMintLimit] = useState("10");
  const [description, setDescription] = useState("Claim this free reward from my SmartSite.");
  const [postInFeed, setPostInFeed] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [savingNft, setSavingNft] = useState(false);
  const [pendingToken, setPendingToken] = useState(false);
  const attachingRef = useRef(false);
  const selectedNft = nfts.find((item) => item._id === selectedNftId);
  const selectedToken = solTokens.find((item) => item.symbol === selectedTokenSymbol) || solTokens[0];
  const art = type === "NFT" ? selectedNft?.image || imageUrl : imageUrl || selectedToken?.logoURI || selectedToken?.logo || "";
  const {
    createLink,
    status: createStatus,
    redeemLink,
    error: createError,
  } = useCreateRedeemLink();

  const publishFeed = useCallback(async (payload: {
    mintName: string;
    symbol: string;
    link: string;
    amount: number;
    mintLimit: number;
    imageUrl: string;
    poolId: string;
  }) => {
    if (!user?._id) return;
    const smartsite = user.microsites?.find((site: { _id?: string }) => site._id === micrositeId);
    await postFeed({
      smartsiteId: micrositeId,
      userId: user._id,
      smartsiteUserName: smartsite?.name || "",
      smartsiteEnsName: smartsite?.ens || smartsite?.ensData?.name || "",
      smartsiteProfilePic: smartsite?.profilePic || "",
      postType: "redeem",
      content: {
        redeemName: payload.mintName,
        symbol: payload.symbol,
        network: "solana",
        link: payload.link,
        amount: payload.amount,
        mintLimit: payload.mintLimit,
        tokenImgUrl: payload.imageUrl,
        poolId: payload.poolId,
      },
    }, accessToken || "");
  }, [accessToken, micrositeId, user]);

  useEffect(() => {
    if (!accessToken) return;
    fetch((process.env.NEXT_PUBLIC_API_URL || "") + "/api/v2/desktop/nft/listByUser", {
      headers: { authorization: "Bearer " + accessToken },
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((body) => setNfts((body.data || []).filter((item: NftTemplate) => item.image && item.collectionMintAddress)))
      .catch(() => toast.error("Could not load NFTs"));
  }, [accessToken]);

  useEffect(() => {
    if (!selectedTokenSymbol && solTokens[0]) setSelectedTokenSymbol(solTokens[0].symbol);
  }, [selectedTokenSymbol, solTokens]);

  useEffect(() => {
    if (!pendingToken || createStatus !== "success" || !redeemLink || attachingRef.current || !selectedToken) return;
    attachingRef.current = true;
    const attach = async () => {
      const limit = Math.floor(Number(mintLimit));
      const each = Number(amountEach);
      const poolId = redeemLink.split("/").filter(Boolean).pop() || redeemLink;
      const payload = {
        micrositeId,
        tokenType: "Token",
        network: "solana",
        imageUrl: art,
        link: redeemLink,
        mintName: name.trim(),
        mintLimit: limit,
        amount: each,
        symbol: selectedToken.symbol,
        description: description.trim(),
        tokenUrl: selectedToken.logoURI || selectedToken.logo || art,
        poolId,
      };
      const result = await postRedeem(payload, accessToken || "");
      if (!result) throw new Error("Could not attach Blink to SmartSite");
      if (postInFeed) await publishFeed(payload);
      toast.success("Blink created and deployed");
      onCloseModal();
    };
    void attach().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Could not deploy Blink");
      attachingRef.current = false;
      setPendingToken(false);
    });
  }, [accessToken, amountEach, art, createStatus, description, micrositeId, mintLimit, name, onCloseModal, pendingToken, postInFeed, publishFeed, redeemLink, selectedToken]);

  useEffect(() => {
    if (createStatus === "error" && createError) {
      toast.error(createError);
      setPendingToken(false);
    }
  }, [createError, createStatus]);

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try { setImageUrl(await sendCloudinaryImage(await readDataUrl(file))); }
    catch { toast.error("Image upload failed"); }
    finally { setImageUploading(false); event.target.value = ""; }
  };

  const create = async () => {
    const each = Number(amountEach);
    const limit = Math.floor(Number(mintLimit));
    if (!name.trim() || !description.trim() || !art || !Number.isFinite(each) || each <= 0 || limit <= 0) {
      return toast.error("Add a name, reward, amount each, mint limit, description, and art");
    }
    if (type === "NFT") {
      if (!selectedNft) return toast.error("Attach an NFT");
      setSavingNft(true);
      try {
        const result = await createNftBlink({
          micrositeId,
          templateId: selectedNft._id,
          name: name.trim(),
          description: description.trim(),
          imageUrl: art,
          amountEach: Math.floor(each),
          mintLimit: limit,
        }, accessToken || "");
        if (!result?.data) throw new Error("NFT Blink deployment failed");
        if (postInFeed) await publishFeed({
          mintName: name.trim(),
          symbol: "NFT",
          link: result.data.link,
          amount: each,
          mintLimit: limit,
          imageUrl: art,
          poolId: result.data.poolId,
        });
        toast.success("NFT Blink created and deployed");
        onCloseModal();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "NFT Blink deployment failed");
      } finally {
        setSavingNft(false);
      }
      return;
    }
    if (!selectedToken) return toast.error("Select a token");
    const total = each * limit;
    if (total > selectedToken.balance) return toast.error("Amount each × mint limit exceeds your balance");
    setPendingToken(true);
    attachingRef.current = false;
    await createLink({
      token: selectedToken,
      totalAmount: total,
      maxWallets: limit,
      tokensPerWallet: each,
    });
  };

  const preview = {
    _id: "blink-preview",
    tokenType: type,
    imageUrl: art,
    link: "",
    mintName: name || "Claim reward",
    mintLimit: Number(mintLimit) || 0,
    amount: Number(amountEach) || 1,
    symbol: type === "NFT" ? "NFT" : selectedToken?.symbol || "TOKEN",
    description,
    poolId: "",
  };
  const input = "w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none";
  const saving = savingNft || pendingToken || createStatus === "processing";

  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Redeem Link / Blink</h2>
        <div className="grid grid-cols-2 rounded-full bg-gray-100 p-1">
          {(["NFT", "Token"] as const).map((value) => <button type="button" key={value} onClick={() => setType(value)} className={"rounded-full py-2 text-xs font-black " + (type === value ? "bg-black text-white" : "text-gray-500")}>{value}</button>)}
        </div>
        <input className={input} value={name} onChange={(event) => setName(event.target.value)} placeholder="Link name" />
        {type === "NFT" ? (
          <div><p className="mb-2 text-xs font-bold text-gray-500">Attach NFT</p><div className="flex gap-2 overflow-x-auto">{nfts.map((nft) => <button type="button" key={nft._id} onClick={() => { setSelectedNftId(nft._id); setImageUrl(nft.image || ""); }} className={"w-28 flex-none rounded-xl border-2 p-2 text-left " + (selectedNftId === nft._id ? "border-black" : "border-transparent bg-gray-100")}><div className="relative h-20 overflow-hidden rounded-lg">{nft.image ? <Image src={nft.image} alt="" fill className="object-cover" /> : null}</div><p className="mt-1 truncate text-xs font-bold">{nft.name}</p></button>)}</div></div>
        ) : (
          <div><p className="mb-2 text-xs font-bold text-gray-500">Select token</p><div className="flex gap-2 overflow-x-auto">{tokensLoading ? <Loader className="h-5 w-5 animate-spin" /> : solTokens.map((token) => <button type="button" key={token.symbol + (token.address || "")} onClick={() => setSelectedTokenSymbol(token.symbol)} className={"w-24 flex-none rounded-xl border-2 p-3 text-center " + (selectedToken?.symbol === token.symbol ? "border-black" : "border-transparent bg-gray-100")}><p className="text-sm font-black">{token.symbol}</p><p className="text-[10px] text-gray-500">{token.balance.toLocaleString(undefined, { maximumFractionDigits: 3 })}</p></button>)}</div></div>
        )}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 px-4 py-3 text-sm font-bold">{imageUploading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload size={15} />}Claim-card art<input type="file" accept="image/*" className="hidden" onChange={(event) => void uploadImage(event)} /></label>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-gray-500">Amount each<input className={input + " mt-1"} type="number" min="1" value={amountEach} onChange={(event) => setAmountEach(event.target.value)} /></label><label className="text-xs font-bold text-gray-500">Mint limit<input className={input + " mt-1"} type="number" min="1" value={mintLimit} onChange={(event) => setMintLimit(event.target.value)} /></label></div>
        <textarea className={input + " min-h-24"} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
        <label className="flex items-center justify-between text-sm font-bold">Post in feed<input type="checkbox" checked={postInFeed} onChange={(event) => setPostInFeed(event.target.checked)} /></label>
        <PrimaryButton onClick={() => void create()} disabled={saving || imageUploading}>{saving ? <Loader className="mx-auto h-5 w-5 animate-spin" /> : "Create & deploy"}</PrimaryButton>
      </div>
      <Redeem data={preview} socialType="redeemLink" number={0} accessToken={accessToken || ""} onClick={() => undefined} />
    </div>
  );
}

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}
