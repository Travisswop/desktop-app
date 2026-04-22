'use client';

import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Clock, X } from 'lucide-react';
import { DepositForm } from './DepositForm';

export type PerpsActionTab = 'deposit' | 'withdraw';

interface PerpsActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterAddress: string | null;
  initialTab?: PerpsActionTab;
  onBridgeToArbitrum?: () => void;
  onDepositSubmitted?: () => void;
}

/**
 * PerpsActionsModal
 *
 * Single modal that exposes both Deposit and Withdraw flows behind a tab UI.
 * The Deposit tab reuses <DepositForm /> (full bridge + faucet support).
 * Withdraw is a placeholder until withdraw3 wiring lands — see PERPS_TASKS.md.
 */
export function PerpsActionsModal({
  isOpen,
  onClose,
  masterAddress,
  initialTab = 'deposit',
  onBridgeToArbitrum,
  onDepositSubmitted,
}: PerpsActionsModalProps) {
  const [tab, setTab] = useState<PerpsActionTab>(initialTab);

  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-gray-800">
            Perps Account
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            <TabButton
              active={tab === 'deposit'}
              onClick={() => setTab('deposit')}
              icon={<ArrowDownToLine className="w-3.5 h-3.5" />}
              label="Deposit"
            />
            <TabButton
              active={tab === 'withdraw'}
              onClick={() => setTab('withdraw')}
              icon={<ArrowUpFromLine className="w-3.5 h-3.5" />}
              label="Withdraw"
            />
          </div>
        </div>

        {tab === 'deposit' ? (
          <DepositForm
            masterAddress={masterAddress}
            onClose={onClose}
            onBridgeToArbitrum={onBridgeToArbitrum}
            onDepositSubmitted={onDepositSubmitted}
            showHeader={false}
          />
        ) : (
          <WithdrawComingSoon onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
        active
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function WithdrawComingSoon({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-6 pb-8 pt-4 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
        <Clock className="w-6 h-6 text-gray-400" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-800">
          Withdrawals Coming Soon
        </h3>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">
          Pulling USDC from Hyperliquid back to Arbitrum is on the way. We&apos;ll
          let you know when it&apos;s ready.
        </p>
      </div>
      <button
        onClick={onClose}
        className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        Got it
      </button>
    </div>
  );
}
