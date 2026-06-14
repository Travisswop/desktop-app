"use client";

import CoinbaseOnrampFunding from "@/components/wallet/CoinbaseOnrampFunding";
import {
  AGENT_PANEL_CLASS,
  GHOST_BUTTON_CLASS,
  PRIMARY_BUTTON_CLASS,
  TICKET_LABEL_CLASS,
} from "../chatStyles";

interface FundingCardProps {
  done?: boolean;
  isFinishing?: boolean;
  onSkip: () => void;
  onDone: () => void;
}

/**
 * Wraps the same Coinbase USDC on-ramp card used inside the messenger
 * (components/wallet/CoinbaseOnrampFunding, rendered by ChatArea) in the
 * agent-panel container so it matches the chat cards.
 */
export default function FundingCard({
  done,
  isFinishing = false,
  onSkip,
  onDone,
}: FundingCardProps) {
  if (done) {
    return (
      <div className={`${AGENT_PANEL_CLASS} w-full max-w-[420px] p-4`}>
        <p className={TICKET_LABEL_CLASS}>Funding</p>
        <p className="mt-1 text-[12.5px] text-[#a9adb8]">
          {isFinishing
            ? "Opening your wallet..."
            : "You can always fund your wallet later from the wallet menu."}
        </p>
      </div>
    );
  }

  return (
    <div className={`${AGENT_PANEL_CLASS} w-full max-w-[420px] p-4`}>
      <div className="mb-3 border-b border-white/[0.07] pb-3">
        <p className={TICKET_LABEL_CLASS}>Step 3 · Fund your wallet</p>
        <h3 className="mt-1 text-[15px] font-semibold text-[#eceef2]">
          Add USDC to get started
        </h3>
      </div>

      <CoinbaseOnrampFunding
        initialNetwork="solana"
        initialAmount="20"
        variant="dark"
        compact
      />

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onSkip}
          disabled={isFinishing}
          className={`${GHOST_BUTTON_CLASS} flex-1 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Maybe later
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={isFinishing}
          className={`${PRIMARY_BUTTON_CLASS} flex-1 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isFinishing ? "Opening..." : "Go to Wallet"}
        </button>
      </div>
    </div>
  );
}
