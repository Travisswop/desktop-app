'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  CheckoutIntent,
  createCheckoutIntent,
  listCheckoutIntents,
} from '@/lib/checkout-api';
import { truncateWalletAddress } from '@/lib/tranacateWalletAddress';
import { useUser } from '@/lib/UserContext';

function formatAmount(intent: CheckoutIntent) {
  const amount = intent.fees?.merchantReceivesAmount ?? intent.amount.value;
  return `${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${intent.amount.currency}`;
}

function formatDueAmount(intent: CheckoutIntent) {
  const amount = intent.fees?.totalDueAmount ?? intent.amount.value;
  return `${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${intent.amount.currency}`;
}

function statusLabel(status: CheckoutIntent['status']) {
  switch (status) {
    case 'settled':
      return 'Settled';
    case 'paid':
      return 'Paid';
    case 'conversion_failed':
      return 'Conversion pending';
    case 'settlement_failed':
      return 'Settlement pending';
    case 'expired':
      return 'Expired';
    case 'cancelled':
      return 'Cancelled';
    case 'pending_payment':
      return 'Pending';
    default:
      return 'Active';
  }
}

export default function CheckoutCreateClient() {
  const { user, accessToken } = useUser();
  const [amount, setAmount] = useState('25.00');
  const [description, setDescription] = useState('');
  const [merchantWalletAddress, setMerchantWalletAddress] = useState('');
  const [createdIntent, setCreatedIntent] = useState<CheckoutIntent | null>(
    null
  );
  const [recentIntents, setRecentIntents] = useState<CheckoutIntent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.solanaWallet && !merchantWalletAddress) {
      setMerchantWalletAddress(user.solanaWallet);
    }
  }, [merchantWalletAddress, user?.solanaWallet]);

  const checkoutBaseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  const loadRecent = async () => {
    if (!accessToken) return;
    setLoadingRecent(true);
    try {
      const intents = await listCheckoutIntents(accessToken);
      setRecentIntents(intents);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to load checkout links'
      );
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;

    setLoading(true);
    try {
      const intent = await createCheckoutIntent(
        {
          amount: Number(amount),
          description,
          merchantWalletAddress,
          merchantCurrency: 'USDC',
          checkoutBaseUrl,
        },
        accessToken
      );
      setCreatedIntent(intent);
      setRecentIntents((current) => [intent, ...current]);
      toast.success('Checkout link created');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create checkout'
      );
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Checkout link copied');
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-[#101114]">
            Checkout
          </h1>
          <p className="mt-1 text-sm text-[#646b78]">
            Create a checkout link that settles Solana or LiFi-routed EVM
            payments into USDC.
          </p>
        </div>
        <button
          type="button"
          onClick={loadRecent}
          disabled={loadingRecent}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dde1e6] bg-white px-3 text-sm font-semibold text-[#303642] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingRecent ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-[#303642]">
              Merchant receives
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                className="h-11 rounded-md border border-[#dde1e6] px-3 text-sm font-medium outline-none focus:border-[#101114]"
                placeholder="25.00"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-[#303642]">
              Merchant currency
              <select
                value="USDC"
                disabled
                className="h-11 rounded-md border border-[#dde1e6] bg-[#fafafa] px-3 text-sm font-medium outline-none"
              >
                <option value="USDC">USDC</option>
              </select>
            </label>
          </div>

          <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-[#303642]">
            Description
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="h-11 rounded-md border border-[#dde1e6] px-3 text-sm font-medium outline-none focus:border-[#101114]"
              placeholder="Order, table, invoice, or note"
              maxLength={180}
            />
          </label>

          <div className="mt-4 rounded-md border border-[#dde1e6] bg-[#fafafa] p-3 text-xs font-medium text-[#5d6574]">
            The entered amount is the merchant payout. Checkout adds the
            platform fee to the payer total and verifies swap/bridge slippage
            before settlement.
          </div>

          <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-[#303642]">
            Settlement wallet
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b93a3]" />
              <input
                value={merchantWalletAddress}
                onChange={(event) =>
                  setMerchantWalletAddress(event.target.value)
                }
                className="h-11 w-full rounded-md border border-[#dde1e6] pl-9 pr-3 text-sm font-medium outline-none focus:border-[#101114]"
                placeholder="Solana wallet address"
                required
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading || !accessToken}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#101114] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create checkout
          </button>
        </form>

        <aside className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#101114]">
            Checkout QR
          </h2>
          {createdIntent ? (
            <div className="mt-4 flex flex-col items-center gap-4">
              <div className="rounded-lg border border-[#dde1e6] bg-white p-3">
                <QRCodeSVG
                  value={createdIntent.checkoutUrl}
                  size={216}
                  bgColor="#ffffff"
                  fgColor="#101114"
                  level="M"
                />
              </div>
              <div className="w-full rounded-md bg-[#fafafa] p-3 text-xs font-medium text-[#4f5868]">
                {createdIntent.checkoutUrl}
              </div>
              <div className="w-full rounded-md border border-[#edf0f3] p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#737b8c]">Merchant receives</span>
                  <strong>{formatAmount(createdIntent)}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[#737b8c]">Payer total</span>
                  <strong>{formatDueAmount(createdIntent)}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyLink(createdIntent.checkoutUrl)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#dde1e6] px-3 text-sm font-semibold text-[#303642]"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy link
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-[#cfd5dd] p-8 text-center text-sm text-[#737b8c]">
              A new checkout QR appears here.
            </div>
          )}
        </aside>
      </section>

      <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#101114]">
            Recent checkout links
          </h2>
          {loadingRecent && (
            <Loader2 className="h-4 w-4 animate-spin text-[#737b8c]" />
          )}
        </div>
        <div className="mt-4 divide-y divide-[#edf0f3]">
          {recentIntents.length === 0 ? (
            <p className="py-5 text-sm text-[#737b8c]">
              No checkout links yet.
            </p>
          ) : (
            recentIntents.map((intent) => (
              <div
                key={intent.intentId}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[#101114]">
                    {intent.description || intent.intentId}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#737b8c]">
                    {formatAmount(intent)} · {statusLabel(intent.status)} ·{' '}
                    {truncateWalletAddress(intent.merchant.wallet.address)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedIntent(intent);
                    copyLink(intent.checkoutUrl);
                  }}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#dde1e6] px-3 text-sm font-semibold text-[#303642]"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
