"use client";

import { useCallback, useEffect, useState } from "react";
import { useCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SelectedSwopId } from "./types";
import {
  AGENT_PANEL_CLASS,
  DmAgentTile,
  TICKET_FIELD_CLASS,
  TICKET_LABEL_CLASS,
} from "./chatStyles";

interface UsernameStepProps {
  onComplete: (selected: SelectedSwopId) => void;
}
type AvailabilityMessage = {
  type: "error" | "success" | null;
  message: string;
};

const SWOP_ID_REGEX = /^[a-z0-9-]{3,10}$/;
const SWOP_ID_GATEWAY = "https://swop-id-ens-gateway.swop.workers.dev";

export default function UsernameStep({ onComplete }: UsernameStepProps) {
  const { toast } = useToast();
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();

  const [swopID, setSwopID] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] =
    useState<AvailabilityMessage>({
      type: null,
      message: "",
    });

  const validateSwopID = useCallback((id: string) => SWOP_ID_REGEX.test(id), []);

  const checkSwopIDAvailability = useCallback(async () => {
    if (!swopID) {
      setAvailabilityMessage({ type: null, message: "" });
      return;
    }

    if (!validateSwopID(swopID)) {
      setAvailabilityMessage({
        type: "error",
        message:
          "Use 3-10 lowercase letters, numbers, or hyphens for your SwopID.",
      });
      return;
    }

    setIsChecking(true);
    try {
      const response = await fetch(`${SWOP_ID_GATEWAY}/get/${swopID}.swop.id`);

      setAvailabilityMessage(
        response.ok
          ? { type: "error", message: "This SwopID is already taken." }
          : response.status === 404
          ? { type: "success", message: "This SwopID is available." }
          : {
              type: "error",
              message: "Could not check availability. Please try again.",
            },
      );
    } catch (error) {
      console.error("Error checking SwopID:", error);
      setAvailabilityMessage({
        type: "error",
        message: "Could not check availability. Please try again.",
      });
    } finally {
      setIsChecking(false);
    }
  }, [swopID, validateSwopID]);

  const getEthereumWallet = useCallback(async () => {
    const embeddedWallet = wallets.find(
      (wallet: any) =>
        wallet.type === "ethereum" && wallet.walletClientType === "privy",
    );
    if (embeddedWallet?.getEthereumProvider) return embeddedWallet;

    const linkedAccounts = (privyUser?.linkedAccounts || []) as any[];
    const linkedEthereumWallet = linkedAccounts.find(
      (account: any) =>
        account.chainType === "ethereum" &&
        (account.walletClientType === "privy" ||
          account.connectorType === "embedded"),
    );
    if (linkedEthereumWallet?.getEthereumProvider) return linkedEthereumWallet;

    const createdWallet = (await createWallet().catch((error: any) => {
      if (error?.message === "embedded_wallet_already_exists") return null;
      throw error;
    })) as any;

    return createdWallet?.wallet || createdWallet || embeddedWallet;
  }, [createWallet, privyUser?.linkedAccounts, wallets]);

  const claimSwopId = useCallback(
    async (ens: string) => {
      const ethereumWallet = await getEthereumWallet();
      if (!ethereumWallet?.getEthereumProvider || !ethereumWallet?.address) {
        throw new Error("No Ethereum wallet available for SwopID creation");
      }

      const provider = await ethereumWallet.getEthereumProvider();
      if (!provider) {
        throw new Error("No Ethereum provider available for SwopID creation");
      }

      const address = ethereumWallet.address;
      const message = `Set ${ens} to ${address}`;
      const signature = await provider.request({
        method: "personal_sign",
        params: [message, address],
      });

      const response = await fetch(`${SWOP_ID_GATEWAY}/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ens,
          owner: address,
          addresses: { 60: address },
          texts: { avatar: "1" },
          signature: { hash: signature, message },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create SwopID: ${errorData}`);
      }

      return address;
    },
    [getEthereumWallet],
  );

  useEffect(() => {
    const debounceTimeout = setTimeout(checkSwopIDAvailability, 500);
    return () => clearTimeout(debounceTimeout);
  }, [checkSwopIDAvailability]);

  const handleSubmit = async () => {
    if (availabilityMessage.type !== "success" || isClaiming) return;

    const ens = `${swopID}.swop.id`;
    setIsClaiming(true);

    try {
      const ownerAddress = await claimSwopId(ens);
      onComplete({
        handle: swopID,
        ens,
        claimed: true,
        ownerAddress,
      });
    } catch (error) {
      console.error("SwopID claim failed:", error);
      toast({
        variant: "destructive",
        title: "Could not claim your SwopID",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0b0c10] p-4 text-[#eceef2]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <DmAgentTile size="h-[44px] w-[44px]" textClassName="text-[15px]" />
          <div>
            <p className="text-[15px] font-semibold text-[#eceef2]">Astro</p>
            <p className="dm-mono text-[11px] text-[#5a5e69]">Onboarding</p>
          </div>
        </div>

        <div className={`${AGENT_PANEL_CLASS} p-6`}>
          <h1 className="text-xl font-semibold text-[#eceef2]">
            Claim your SwopID
          </h1>
          <p className="mt-2 text-[13px] text-[#a9adb8]">
            Pick a username. Then Astro will set up your SmartSite from a quick
            chat.
          </p>

          <div className="mt-6">
            <label className={`${TICKET_LABEL_CLASS} mb-2 block`}>
              Username
            </label>

            <div className="relative">
              <input
                value={swopID}
                onChange={(event) =>
                  setSwopID(event.target.value.toLowerCase().trim())
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSubmit();
                }}
                className={`${TICKET_FIELD_CLASS} h-12 pr-24 text-[14px]`}
                placeholder="claim a SwopID"
                disabled={isChecking || isClaiming}
              />
              <span className="dm-mono pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 text-[12px] text-[#5a5e69]">
                .swop.id
              </span>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={
                  !swopID ||
                  availabilityMessage.type !== "success" ||
                  isChecking ||
                  isClaiming
                }
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[9px] bg-[#3fe08f] text-[#031008] transition hover:bg-[#64f2aa] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isChecking || isClaiming ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
              </button>
            </div>

            {availabilityMessage.type && (
              <p
                className={`mt-2 text-[12.5px] ${
                  availabilityMessage.type === "error"
                    ? "text-red-400"
                    : "text-[#3fe08f]"
                }`}
              >
                {availabilityMessage.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
