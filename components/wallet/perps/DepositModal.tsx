'use client';

import { useCallback } from 'react';
import { DepositForm } from './DepositForm';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterAddress: string | null;
  /** Called when user needs to bridge funds to Arbitrum USDC — opens LiFi */
  onBridgeToArbitrum?: () => void;
  /**
   * Called immediately after the deposit transaction is submitted (tx hash
   * received). Use this to start polling the Hyperliquid balance so the
   * "Enable Trading" button unlocks automatically once funds settle.
   */
  onDepositSubmitted?: () => void;
}

/**
 * DepositModal
 *
 * Stand-alone modal frame around <DepositForm />. Used in places that want a
 * single deposit-only experience (e.g., the Agent Setup flow). For the
 * dashboard PerpsCard, see <PerpsActionsModal /> which wraps the same form
 * with Deposit/Withdraw tabs.
 */
export function DepositModal({
  isOpen,
  onClose,
  masterAddress,
  onBridgeToArbitrum,
  onDepositSubmitted,
}: DepositModalProps) {
  const handleClose = useCallback(() => onClose(), [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <DepositForm
          masterAddress={masterAddress}
          onClose={handleClose}
          onBridgeToArbitrum={onBridgeToArbitrum}
          onDepositSubmitted={onDepositSubmitted}
        />
      </div>
    </div>
  );
}
