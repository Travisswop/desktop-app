"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import swopImg from "@/public/images/swop-world.png";
import { SelectedSwopId } from "./types";

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
  const [swopID, setSwopID] = useState("");
  const [isChecking, setIsChecking] = useState(false);
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

  useEffect(() => {
    const debounceTimeout = setTimeout(checkSwopIDAvailability, 500);
    return () => clearTimeout(debounceTimeout);
  }, [checkSwopIDAvailability]);

  const handleSubmit = () => {
    if (availabilityMessage.type !== "success") return;

    onComplete({
      handle: swopID,
      ens: `${swopID}.swop.id`,
    });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 w-full">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-8">
          <Image src={swopImg} alt="Swop" className="w-32 h-auto" />
        </div>

        <div className="bg-white rounded-3xl shadow-medium p-8 sm:p-12">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">
              Claim Your SwopID
            </h1>
            <p className="text-gray-500">
              Start with your username. Then the assistant will build your
              SmartSite from a quick chat.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-900 mb-3 block">
                Username
              </label>

              <div className="relative">
                <Input
                  value={swopID}
                  onChange={(event) =>
                    setSwopID(event.target.value.toLowerCase().trim())
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSubmit();
                  }}
                  className="w-full h-14 pl-6 pr-24 text-base rounded-xl border-gray-200 focus:border-gray-300 focus:ring-0"
                  placeholder="claim a SwopID"
                  disabled={isChecking}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !swopID ||
                    availabilityMessage.type !== "success" ||
                    isChecking
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 bg-black hover:bg-gray-800 rounded-lg"
                >
                  {isChecking ? (
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
                      : "text-green-600"
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
