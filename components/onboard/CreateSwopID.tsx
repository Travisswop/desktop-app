"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallets } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import Image from "next/image";
import swopImg from "@/public/images/swop-world.png";

interface OnboardingData {
  userInfo?: {
    avatar?: string;
    primaryMicrosite?: string;
  };
}

interface CreateSwopIDProps {
  userData: OnboardingData;
}

type AvailabilityMessage = {
  type: "error" | "success" | null;
  message: string;
};

const SWOP_ID_REGEX = /^[a-z0-9-]{3,10}$/;
const SWOP_ID_GATEWAY = "https://swop-id-ens-gateway.swop.workers.dev";

export default function CreateSwopID({ userData }: CreateSwopIDProps) {
  const { wallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { toast } = useToast();
  const router = useRouter();

  const [swopID, setSwopID] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] =
    useState<AvailabilityMessage>({
      type: null,
      message: "",
    });

  const validateSwopID = useCallback((id: string): boolean => {
    return SWOP_ID_REGEX.test(id);
  }, []);

  const checkSwopIDAvailability = useCallback(async () => {
    if (!swopID) {
      setAvailabilityMessage({ type: null, message: "" });
      return;
    }

    if (!validateSwopID(swopID)) {
      setAvailabilityMessage({
        type: "error",
        message:
          "SwopID must be 3-10 characters long and can only contain letters, numbers, and hyphens",
      });
      return;
    }

    setIsChecking(true);
    try {
      const response = await fetch(`${SWOP_ID_GATEWAY}/get/${swopID}.swop.id`);

      setAvailabilityMessage(
        response.ok
          ? { type: "error", message: "This SwopID is already taken" }
          : response.status === 404
          ? { type: "success", message: "This SwopID is available!" }
          : {
              type: "error",
              message: "Failed to check availability. Please try again.",
            }
      );
    } catch (error) {
      console.error("Error checking SwopID:", error);
      setAvailabilityMessage({
        type: "error",
        message: "Failed to check availability. Please try again.",
      });
    } finally {
      setIsChecking(false);
    }
  }, [swopID, validateSwopID]);

  useEffect(() => {
    const debounceTimeout = setTimeout(checkSwopIDAvailability, 500);
    return () => clearTimeout(debounceTimeout);
  }, [checkSwopIDAvailability]);

  const createSwopID = useCallback(async () => {
    try {
      const ethereumWallet = wallets.find(
        (wallet: any) =>
          wallet.type === "ethereum" && wallet.walletClientType === "privy"
      );

      if (!ethereumWallet) {
        throw new Error("No Ethereum wallet available");
      }

      const solanaWallet = solanaWallets?.[0];
      if (!solanaWallet) {
        console.warn(
          "No Solana wallet available, proceeding with Ethereum only"
        );
      }

      const provider = await ethereumWallet.getEthereumProvider();
      const address = ethereumWallet.address;
      const ens = `${swopID}.swop.id`;
      const message = `Set ${ens} to ${address}`;

      const signature = await provider.request({
        method: "personal_sign",
        params: [message, address],
      });

      const requestBody = {
        name: ens,
        owner: address,
        addresses: {
          60: address,
          ...(solanaWallet?.address ? { 501: solanaWallet.address } : {}),
        },
        texts: {
          avatar: userData.userInfo?.avatar || "",
        },
        signature: {
          hash: signature,
          message: message,
        },
      };

      const response = await fetch(`${SWOP_ID_GATEWAY}/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create Swop ID: ${errorData}`);
      }

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/addSocial`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: "ensDomain",
            micrositeId: userData.userInfo?.primaryMicrosite,
            domain: ens,
          }),
        }
      );

      toast({
        title: "Success",
        description: "SwopID created successfully!",
      });

      setTimeout(() => {
        setIsSubmitting(false);
        router.push("/");
      }, 2000);
    } catch (error) {
      console.error("Error creating SwopID:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create SwopID",
      });
      setIsSubmitting(false);
    }
  }, [swopID, userData, toast, router, solanaWallets, wallets]);

  const handleSubmit = async () => {
    if (!swopID || availabilityMessage.type !== "success") {
      return;
    }

    setIsSubmitting(true);
    await createSwopID();
    router.push("/");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 w-full">
      <div className="w-full max-w-2xl">
        {/* Planet logo */}
        <div className="flex justify-center mb-8">
          <Image src={swopImg} alt="swop image" className="w-32 h-auto" />
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-medium p-12">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">
              Claim Your Link
            </h1>
            <p className="text-gray-500">
              Swopple.ID lets wallet users send crypto and NFTs with
              <br />a simple username
            </p>
          </div>

          {/* Input Section */}
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-900 mb-3">
                Username
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </label>

              <div className="relative">
                <Input
                  value={swopID}
                  onChange={(e) => setSwopID(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full h-14 pl-6 pr-24 text-base rounded-xl border-gray-200 focus:border-gray-300 focus:ring-0"
                  placeholder="Claim a Swop.ID"
                  disabled={isChecking || isSubmitting}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !swopID ||
                    availabilityMessage.type !== "success" ||
                    isChecking ||
                    isSubmitting
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 bg-black hover:bg-gray-800 rounded-lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </Button>
              </div>

              {availabilityMessage.type && (
                <p
                  className={`text-sm mt-2 ${
                    availabilityMessage.type === "error"
                      ? "text-red-500"
                      : "text-green-500"
                  }`}
                >
                  {availabilityMessage.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
