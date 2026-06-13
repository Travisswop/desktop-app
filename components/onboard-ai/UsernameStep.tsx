"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
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
                  if (event.key === "Enter") handleSubmit();
                }}
                className={`${TICKET_FIELD_CLASS} h-12 pr-24 text-[14px]`}
                placeholder="claim a SwopID"
                disabled={isChecking}
              />
              <span className="dm-mono pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 text-[12px] text-[#5a5e69]">
                .swop.id
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  !swopID ||
                  availabilityMessage.type !== "success" ||
                  isChecking
                }
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[9px] bg-[#3fe08f] text-[#031008] transition hover:bg-[#64f2aa] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isChecking ? (
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
