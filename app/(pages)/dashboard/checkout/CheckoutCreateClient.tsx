'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  Download,
  Loader2,
  Minus,
  Package,
  Plus,
  QrCode,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Trash2,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  CheckoutIntent,
  StablecoinMerchantStatus,
  createCheckoutRefundRequest,
  createCheckoutIntent,
  getStablecoinMerchantStatus,
  listCheckoutIntents,
  reconcileCheckoutIntent,
} from '@/lib/checkout-api';
import {
  listMarketplaceProducts,
  type MarketplaceProduct,
} from '@/lib/marketplace-api';
import { copyTextToClipboard } from '@/lib/clipboard';
import { getPhantomCheckoutUrl } from '@/lib/phantom-checkout';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';
import { truncateWalletAddress } from '@/lib/tranacateWalletAddress';
import { useUser } from '@/lib/UserContext';

const PLATFORM_FEE_BPS = 50;

type ProductRow = {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  currency: string;
  productType: string;
  stock?: number;
};

type CartLine = {
  product: ProductRow;
  quantity: number;
};

function toMoney(value: number, currency = 'USDC') {
  return `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatAmount(intent: CheckoutIntent) {
  const amount = intent.fees?.merchantReceivesAmount ?? intent.amount.value;
  return toMoney(amount, intent.amount.currency);
}

function formatDueAmount(intent: CheckoutIntent) {
  const amount = intent.fees?.totalDueAmount ?? intent.amount.value;
  return toMoney(amount, intent.amount.currency);
}

function paymentRequestStatus(intent: CheckoutIntent) {
  if (intent.paymentRequest?.status === 'settled') return 'Reference settled';
  if (intent.paymentRequest?.status === 'detected') return 'Reference detected';
  if (intent.paymentRequest?.status === 'expired') return 'Reference expired';
  if (intent.paymentRequest?.reference) return 'Reference ready';
  return 'Legacy link';
}

function trustLabel(status?: StablecoinMerchantStatus | null) {
  const tier = status?.trust.tier || 'basic';
  if (tier === 'verified_profile') return 'Verified profile';
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function escapeCsv(value: unknown) {
  const raw = String(value ?? '');
  if (!/[",\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
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

function statusTone(status: CheckoutIntent['status']) {
  switch (status) {
    case 'settled':
    case 'paid':
      return 'border-[#bfe8cf] bg-[#effaf3] text-[#166534]';
    case 'conversion_failed':
    case 'settlement_failed':
    case 'pending_payment':
      return 'border-[#f1d8a7] bg-[#fff8e6] text-[#8a5a00]';
    case 'expired':
    case 'cancelled':
      return 'border-[#e5e7eb] bg-[#f4f5f7] text-[#5d6673]';
    default:
      return 'border-[#c8d7ff] bg-[#eef4ff] text-[#1d4ed8]';
  }
}

function formatSaleDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function lineItemCount(intent: CheckoutIntent) {
  return (
    intent.lineItems?.reduce(
      (total, item) => total + Math.max(0, Number(item.quantity) || 0),
      0
    ) || 0
  );
}

function isPaidStatus(status: CheckoutIntent['status']) {
  return ['paid', 'settled', 'settlement_failed'].includes(status);
}

function canReconcileStatus(status: CheckoutIntent['status']) {
  return [
    'active',
    'pending_payment',
    'conversion_failed',
    'settlement_failed',
  ].includes(status);
}

function reconcileActionLabel(status: CheckoutIntent['status']) {
  if (status === 'settlement_failed') return 'Retry settlement';
  if (status === 'conversion_failed') return 'Retry conversion';
  return 'Reconcile';
}

function mapProduct(item: MarketplaceProduct): ProductRow {
  return {
    id: item._id,
    name: item.title || 'Untitled product',
    description: item.description || '',
    image: item.primaryImage || item.images?.[0]?.url || '',
    price: Number(item.price?.amount) || 0,
    currency: (item.price?.currency || 'USDC').toUpperCase(),
    productType: item.productType || '',
    stock:
      typeof item.inventory?.available === 'number'
        ? item.inventory.available
        : undefined,
  };
}

export default function CheckoutCreateClient() {
  const router = useRouter();
  const { user, accessToken } = useUser();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [search, setSearch] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [saleDescription, setSaleDescription] = useState('');
  const [merchantWalletAddress, setMerchantWalletAddress] = useState('');
  const [createdIntent, setCreatedIntent] = useState<CheckoutIntent | null>(
    null
  );
  const [recentIntents, setRecentIntents] = useState<CheckoutIntent[]>([]);
  const [merchantStatus, setMerchantStatus] =
    useState<StablecoinMerchantStatus | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState('');
  const copyFallbackInputRef = useRef<HTMLInputElement | null>(null);
  const [terminalMode, setTerminalMode] = useState(false);
  const [reconcileHash, setReconcileHash] = useState('');
  const [reconcilingIntentId, setReconcilingIntentId] = useState<string | null>(
    null
  );
  const [refundIntentId, setRefundIntentId] = useState<string | null>(null);
  const [refundWallet, setRefundWallet] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    if (user?.solanaWallet && !merchantWalletAddress) {
      setMerchantWalletAddress(user.solanaWallet);
    }
  }, [merchantWalletAddress, user?.solanaWallet]);

  const checkoutBaseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);
  const phantomLinkForIntent = useCallback(
    (intent: CheckoutIntent) =>
      getPhantomCheckoutUrl({
        checkoutUrl: intent.checkoutUrl,
        intentId: intent.intentId,
        refUrl: checkoutBaseUrl || undefined,
      }) || intent.checkoutUrl,
    [checkoutBaseUrl]
  );

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartQuantity = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.product.price * item.quantity,
        0
      ),
    [cartItems]
  );
  const manualAmountValue = useMemo(() => {
    const value = Number(manualAmount);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [manualAmount]);
  const saleSubtotal = cartItems.length > 0 ? subtotal : manualAmountValue;
  const estimatedFee = useMemo(
    () => Number((saleSubtotal * (PLATFORM_FEE_BPS / 10000)).toFixed(6)),
    [saleSubtotal]
  );
  const estimatedPayerTotal = useMemo(
    () => Number((saleSubtotal + estimatedFee).toFixed(6)),
    [estimatedFee, saleSubtotal]
  );
  const isRefreshing = loadingProducts || loadingRecent;
  const canCreateSale =
    Boolean(accessToken) &&
    Boolean(merchantWalletAddress) &&
    (cartItems.length > 0 || manualAmountValue > 0);
  const createdPhantomCheckoutUrl = useMemo(
    () => (createdIntent ? phantomLinkForIntent(createdIntent) : ''),
    [createdIntent, phantomLinkForIntent]
  );

  const salesSummary = useMemo(() => {
    const todayKey = new Date().toDateString();
    return recentIntents.reduce(
      (summary, intent) => {
        const amount = intent.fees?.merchantReceivesAmount ?? intent.amount.value;
        if (new Date(intent.createdAt).toDateString() === todayKey) {
          summary.todaySales += amount;
          summary.todayCount += 1;
        }
        if (intent.status === 'active' || intent.status === 'pending_payment') {
          summary.pendingCount += 1;
        }
        if (isPaidStatus(intent.status)) {
          summary.paidCount += 1;
        }
        if (intent.status === 'expired') {
          summary.expiredCount += 1;
        }
        return summary;
      },
      {
        todaySales: 0,
        todayCount: 0,
        pendingCount: 0,
        paidCount: 0,
        expiredCount: 0,
      }
    );
  }, [recentIntents]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((product) => product.currency === 'USDC')
      .filter((product) => product.price > 0)
      .filter((product) => {
        if (!query) return true;
        return (
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query)
        );
      });
  }, [products, search]);

  const loadProducts = useCallback(async () => {
    if (!accessToken) return;
    setLoadingProducts(true);
    try {
      const payload = await listMarketplaceProducts(accessToken, {
        scope: 'mine',
        status: 'live',
        limit: 200,
      });
      setProducts((payload.items || []).map(mapProduct));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to load products'
      );
    } finally {
      setLoadingProducts(false);
    }
  }, [accessToken]);

  const loadRecent = useCallback(async () => {
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
  }, [accessToken]);

  const loadMerchantStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      const status = await getStablecoinMerchantStatus(accessToken);
      setMerchantStatus(status);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to load stablecoin status'
      );
    }
  }, [accessToken]);

  useEffect(() => {
    loadProducts();
    loadRecent();
    loadMerchantStatus();
  }, [loadProducts, loadRecent, loadMerchantStatus]);

  useEffect(() => {
    if (!copyFallback) return;
    window.setTimeout(() => {
      copyFallbackInputRef.current?.focus();
      copyFallbackInputRef.current?.select();
    }, 0);
  }, [copyFallback]);

  const addProduct = (product: ProductRow) => {
    setCreatedIntent(null);
    setManualAmount('');
    setCart((current) => ({
      ...current,
      [product.id]: {
        product,
        quantity: (current[product.id]?.quantity || 0) + 1,
      },
    }));
  };

  const setQuantity = (productId: string, quantity: number) => {
    setCreatedIntent(null);
    setCart((current) => {
      if (quantity <= 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      const item = current[productId];
      if (!item) return current;
      return {
        ...current,
        [productId]: {
          ...item,
          quantity,
        },
      };
    });
  };

  const handleCreate = async () => {
    if (!accessToken || !canCreateSale) return;

    setCreating(true);
    try {
      const intent = await createCheckoutIntent(
        {
          ...(cartItems.length > 0
            ? {
                lineItems: cartItems.map((item) => ({
                  productId: item.product.id,
                  quantity: item.quantity,
                })),
              }
            : {
                amount: manualAmountValue,
                description:
                  saleDescription.trim() || 'QR checkout',
              }),
          merchantWalletAddress,
          merchantCurrency: 'USDC',
          checkoutMode: 'in_person',
          checkoutBaseUrl,
        },
        accessToken
      );
      setCreatedIntent(intent);
      setRecentIntents((current) => [intent, ...current]);
      toast.success('Checkout QR ready');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create checkout'
      );
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (url: string) => {
    const copiedToClipboard = await copyTextToClipboard(url);
    if (copiedToClipboard) {
      setCopyFallback('');
      setCopied(true);
      toast.success('Copied');
      window.setTimeout(() => setCopied(false), 1600);
      return;
    }

    setCopyFallback(url);
    toast('Link selected. Press Cmd+C to copy.');
  };

  const startNewSale = () => {
    setCart({});
    setManualAmount('');
    setSaleDescription('');
    setCreatedIntent(null);
    setCopied(false);
  };

  const exportCsv = () => {
    const rows = [
      [
        'intent_id',
        'status',
        'description',
        'merchant_receives',
        'payer_total',
        'payment_reference',
        'payment_tx',
        'settlement_tx',
        'created_at',
        'expires_at',
      ],
      ...recentIntents.map((intent) => [
        intent.intentId,
        intent.status,
        intent.description || '',
        intent.fees?.merchantReceivesAmount ?? intent.amount.value,
        intent.fees?.totalDueAmount ?? intent.amount.value,
        intent.paymentRequest?.reference || '',
        intent.payment?.txHash || '',
        intent.settlement?.txHash || '',
        intent.createdAt,
        intent.expiresAt,
      ]),
    ];
    const csv = rows
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `swop-checkout-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReconcile = async (intent: CheckoutIntent) => {
    if (!accessToken) return;
    setReconcilingIntentId(intent.intentId);
    try {
      const result = await reconcileCheckoutIntent(
        intent.intentId,
        { txHash: reconcileHash.trim() },
        accessToken
      );
      if (result.intent) {
        setRecentIntents((current) =>
          current.map((item) =>
            item.intentId === result.intent?.intentId ? result.intent : item
          )
        );
        setCreatedIntent((current) =>
          current?.intentId === result.intent?.intentId
            ? result.intent || current
            : current
        );
      }
      toast.success(result.message || 'Reconciliation checked');
      if (result.transactionHash) setReconcileHash('');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to reconcile checkout'
      );
    } finally {
      setReconcilingIntentId(null);
    }
  };

  const startRefund = (intent: CheckoutIntent) => {
    setRefundIntentId(intent.intentId);
    setRefundWallet(intent.payer?.wallet?.address || '');
    setRefundAmount(
      String(intent.fees?.merchantReceivesAmount ?? intent.amount.value)
    );
    setRefundReason('');
  };

  const submitRefund = async () => {
    if (!accessToken || !refundIntentId) return;
    try {
      const updated = await createCheckoutRefundRequest(
        refundIntentId,
        {
          payerWallet: refundWallet,
          amount: Number(refundAmount),
          reason: refundReason,
        },
        accessToken
      );
      setRecentIntents((current) =>
        current.map((item) =>
          item.intentId === updated.intentId ? updated : item
        )
      );
      setCreatedIntent((current) =>
        current?.intentId === updated.intentId ? updated : current
      );
      const latestRefund = updated.refundRequests?.length
        ? updated.refundRequests[updated.refundRequests.length - 1]
        : null;
      if (latestRefund?.solanaPayUrl) {
        await copyLink(latestRefund.solanaPayUrl);
      }
      toast.success('Refund request ready');
      setRefundIntentId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create refund'
      );
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 pb-28 text-[#101114]">
      <div className="rounded-lg border border-[#e6e9ef] bg-[#fbfcfd] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              aria-label="Back to dashboard"
              className="inline-flex h-10 w-fit shrink-0 items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-semibold text-[#303642] shadow-sm transition hover:border-[#c8d0dc] hover:bg-[#f7f8fa]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-normal text-[#101114]">
                  Checkout
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#dce3ec] bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#626b7a]">
                  <QrCode className="h-3.5 w-3.5" />
                  USDC QR
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-[#646b78]">
                Build a product sale, generate the QR, and let the payer choose
                the currency on their device.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => {
                loadProducts();
                loadRecent();
              }}
              disabled={isRefreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-semibold text-[#303642] shadow-sm transition hover:border-[#c8d0dc] hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
            <button
              type="button"
              onClick={startNewSale}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#101114] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#24262b]"
            >
              <Plus className="h-4 w-4" />
              New sale
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <div className="flex items-center gap-3 rounded-md border border-[#e6e9ef] bg-white p-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#f1f4f8] text-[#4f5b6b]">
              <Tag className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#737b8c]">
                Products
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#101114]">
                {visibleProducts.length} USDC-ready
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-[#e6e9ef] bg-white p-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#f1f4f8] text-[#4f5b6b]">
              <ShoppingCart className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#737b8c]">
                Current sale
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#101114]">
                {cartQuantity} {cartQuantity === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-[#e6e9ef] bg-white p-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#f1f4f8] text-[#4f5b6b]">
              <ReceiptText className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#737b8c]">
                Recent
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#101114]">
                {recentIntents.length}{' '}
                {recentIntents.length === 1 ? 'sale' : 'sales'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-[#e6e9ef] bg-white p-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#f1f4f8] text-[#4f5b6b]">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#737b8c]">
                Trust tier
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#101114]">
                {trustLabel(merchantStatus)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-[#e6e9ef] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#737b8c]">
            Today
          </p>
          <p className="mt-1 font-mono text-lg font-semibold">
            {toMoney(salesSummary.todaySales)}
          </p>
          <p className="mt-1 text-xs text-[#737b8c]">
            {salesSummary.todayCount} links created
          </p>
        </div>
        <div className="rounded-lg border border-[#e6e9ef] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#737b8c]">
            Awaiting payment
          </p>
          <p className="mt-1 text-lg font-semibold">
            {salesSummary.pendingCount}
          </p>
          <p className="mt-1 text-xs text-[#737b8c]">
            Active or pending signature
          </p>
        </div>
        <div className="rounded-lg border border-[#e6e9ef] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#737b8c]">
            Paid
          </p>
          <p className="mt-1 text-lg font-semibold">
            {salesSummary.paidCount}
          </p>
          <p className="mt-1 text-xs text-[#737b8c]">
            Paid or settlement review
          </p>
        </div>
        <div className="rounded-lg border border-[#e6e9ef] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#737b8c]">
            Stripe KYB
          </p>
          <p className="mt-1 text-sm font-semibold">
            {merchantStatus?.screening.status === 'not_required_for_stablecoin'
              ? 'Deferred'
              : 'Provider ready'}
          </p>
          <p className="mt-1 text-xs text-[#737b8c]">
            Stablecoin limit: {toMoney(merchantStatus?.trust.perPaymentLimit || 100)}
          </p>
        </div>
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-lg border border-[#e6e9ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf0f3] bg-[#fbfcfd] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#101114]">
                Products
              </h2>
              <p className="mt-1 text-xs font-medium text-[#737b8c]">
                {visibleProducts.length} available for USDC checkout
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b93a3]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products"
                className="h-10 w-full rounded-md border border-[#dfe4eb] bg-white pl-9 pr-3 text-sm font-medium text-[#101114] outline-none transition placeholder:text-[#9aa3b2] focus:border-[#101114] focus:ring-2 focus:ring-[#101114]/10"
              />
            </div>
          </div>

          <div className="p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {loadingProducts ? (
                <div className="col-span-full flex min-h-[180px] items-center justify-center gap-3 rounded-lg border border-dashed border-[#d4dae3] bg-[#fbfcfd] text-sm font-medium text-[#646b78]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading products...
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="col-span-full flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-[#d4dae3] bg-[#fbfcfd] p-8 text-center">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white text-[#737b8c] shadow-sm ring-1 ring-[#e6e9ef]">
                    <Package className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-[#303642]">
                    No priced USDC products
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#858d9b]">
                    0 products matched this checkout filter.
                  </p>
                </div>
              ) : (
                visibleProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="group flex min-h-[154px] flex-col justify-between rounded-lg border border-[#e8ebf0] bg-[#fbfcfd] p-3 text-left transition hover:border-[#101114] hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex gap-3">
                      {product.image ? (
                        <Image
                          src={sanitizeNextImageSrc(product.image)}
                          alt={product.name}
                          width={52}
                          height={52}
                          className="h-[52px] w-[52px] rounded-md object-cover ring-1 ring-[#e8ebf0]"
                        />
                      ) : (
                        <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-md bg-white ring-1 ring-[#e8ebf0]">
                          <Package className="h-5 w-5 text-[#737b8c]" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#101114]">
                          {product.name}
                        </p>
                        <span className="mt-2 inline-flex max-w-full items-center rounded-full border border-[#e1e5eb] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#737b8c]">
                          <span className="truncate">
                            {product.productType || 'Product'}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="font-mono text-sm font-semibold text-[#101114]">
                        {toMoney(product.price, product.currency)}
                      </span>
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#101114] text-white transition group-hover:bg-[#24262b]">
                        <Plus className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-[#e6e9ef] bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#101114]">
                Current sale
              </h2>
              <p className="mt-1 text-xs font-medium text-[#737b8c]">
                {cartItems.length}{' '}
                {cartItems.length === 1 ? 'product' : 'products'} ·{' '}
                {cartQuantity} {cartQuantity === 1 ? 'item' : 'items'}
              </p>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#f1f4f8] text-[#626b7a]">
              <ShoppingCart className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-4 rounded-lg border border-[#edf0f3] bg-[#fbfcfd] p-3">
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
              Quick amount
              <input
                value={manualAmount}
                onChange={(event) => {
                  setManualAmount(event.target.value);
                  setCart({});
                  setCreatedIntent(null);
                }}
                inputMode="decimal"
                placeholder="0.00"
                className="h-10 rounded-md border border-[#dfe4eb] bg-white px-3 font-mono text-sm font-semibold normal-case tracking-normal text-[#101114] outline-none transition focus:border-[#101114] focus:ring-2 focus:ring-[#101114]/10"
              />
            </label>
            <label className="mt-3 flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
              Sale note
              <input
                value={saleDescription}
                onChange={(event) => setSaleDescription(event.target.value)}
                placeholder="QR checkout"
                className="h-10 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[#101114] outline-none transition focus:border-[#101114] focus:ring-2 focus:ring-[#101114]/10"
              />
            </label>
          </div>

          <div className="mt-4 max-h-[304px] overflow-y-auto rounded-lg border border-[#edf0f3] bg-[#fbfcfd] p-2">
            {cartItems.length === 0 ? (
              <div className="flex min-h-[112px] flex-col items-center justify-center rounded-md border border-dashed border-[#d4dae3] bg-white p-5 text-center">
                <ShoppingCart className="h-5 w-5 text-[#8b93a3]" />
                <p className="mt-2 text-sm font-semibold text-[#303642]">
                  Current sale is empty
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="rounded-md border border-[#e8ebf0] bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#101114]">
                          {item.product.name}
                        </p>
                        <p className="mt-1 font-mono text-xs text-[#737b8c]">
                          {toMoney(item.product.price, item.product.currency)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuantity(item.product.id, 0)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#737b8c] transition hover:bg-[#f5f6f8] hover:text-[#101114]"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex h-9 items-center overflow-hidden rounded-md border border-[#dfe4eb] bg-[#fbfcfd]">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(item.product.id, item.quantity - 1)
                          }
                          className="inline-flex h-9 w-9 items-center justify-center transition hover:bg-white"
                          title="Decrease"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[36px] px-2 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(item.product.id, item.quantity + 1)
                          }
                          className="inline-flex h-9 w-9 items-center justify-center transition hover:bg-white"
                          title="Increase"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="font-mono text-sm font-semibold text-[#101114]">
                        {toMoney(
                          item.product.price * item.quantity,
                          item.product.currency
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <dl className="mt-4 rounded-lg border border-[#edf0f3] bg-[#fbfcfd] p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#737b8c]">Merchant receives</dt>
              <dd className="font-mono font-semibold">{toMoney(saleSubtotal)}</dd>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <dt className="text-[#737b8c]">Checkout fee</dt>
              <dd className="font-mono font-semibold">
                {toMoney(estimatedFee)}
              </dd>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-[#101114] px-3 py-3 text-white">
              <dt className="text-sm font-semibold">Payer total</dt>
              <dd className="font-mono text-sm font-semibold">
                {toMoney(estimatedPayerTotal)}
              </dd>
            </div>
          </dl>

          <label className="mt-4 flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
            Settlement wallet
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b93a3]" />
              <input
                value={merchantWalletAddress}
                onChange={(event) =>
                  setMerchantWalletAddress(event.target.value)
                }
                className="h-10 w-full rounded-md border border-[#dfe4eb] bg-white pl-9 pr-3 font-mono text-xs font-semibold normal-case tracking-normal text-[#4f5b6b] outline-none transition focus:border-[#101114] focus:ring-2 focus:ring-[#101114]/10"
                placeholder="Solana wallet address"
                required
              />
            </div>
          </label>

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !canCreateSale}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#101114] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#24262b] disabled:cursor-not-allowed disabled:bg-[#8b8b8d] disabled:opacity-80"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4" />
            )}
            Create QR
          </button>

          {createdIntent ? (
            <div className="mt-5 overflow-hidden rounded-lg border border-[#c8ead4] bg-[#f8fff9]">
              <div className="flex items-center justify-between gap-3 border-b border-[#dff3e5] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#14532d]">
                    Phantom QR ready
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-[#5f7f6b]">
                    {formatDueAmount(createdIntent)}
                  </p>
                </div>
                <Check className="h-5 w-5 text-[#15803d]" />
              </div>
              <div
                className={`flex flex-col items-center gap-4 p-4 ${
                  terminalMode ? 'min-h-[70vh] justify-center' : ''
                }`}
              >
                <div className="rounded-lg border border-[#dfe4eb] bg-white p-3 shadow-sm">
                  <QRCodeSVG
                    value={
                      createdPhantomCheckoutUrl ||
                      createdIntent.paymentRequest?.url ||
                      createdIntent.checkoutUrl
                    }
                    size={terminalMode ? 320 : 216}
                    bgColor="#ffffff"
                    fgColor="#101114"
                    level="M"
                  />
                </div>
                <div className="w-full rounded-md border border-[#edf0f3] bg-white p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#737b8c]">Merchant receives</span>
                    <strong className="font-mono">
                      {formatAmount(createdIntent)}
                    </strong>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[#737b8c]">Payer total</span>
                    <strong className="font-mono">
                      {formatDueAmount(createdIntent)}
                    </strong>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[#737b8c]">Detection</span>
                    <strong className="text-xs">
                      {paymentRequestStatus(createdIntent)}
                    </strong>
                  </div>
                  {createdIntent.paymentRequest?.reference ? (
                    <p className="mt-3 break-all font-mono text-[11px] text-[#737b8c]">
                      Ref {createdIntent.paymentRequest.reference}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyLink(createdPhantomCheckoutUrl || createdIntent.checkoutUrl)
                  }
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#5f4acb] px-3 text-sm font-semibold text-white transition hover:bg-[#523db8]"
                >
                  <Copy className="h-4 w-4" />
                  Copy Phantom link
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalMode((value) => !value)}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#101114] px-3 text-sm font-semibold text-white transition hover:bg-[#24262b]"
                >
                  <QrCode className="h-4 w-4" />
                  {terminalMode ? 'Exit terminal mode' : 'QR terminal mode'}
                </button>
                {createdIntent.paymentRequest?.url ? (
                  <button
                    type="button"
                    onClick={() =>
                      copyLink(createdIntent.paymentRequest?.url || '')
                    }
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-semibold text-[#303642] transition hover:border-[#c8d0dc] hover:bg-[#f7f8fa]"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Solana Pay URI
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => copyLink(createdIntent.checkoutUrl)}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-semibold text-[#303642] transition hover:border-[#c8d0dc] hover:bg-[#f7f8fa]"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy web link
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#e6e9ef] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#edf0f3] bg-[#fbfcfd] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#101114]">
              Recent sales
            </h2>
            <p className="mt-1 text-xs font-medium text-[#737b8c]">
              {recentIntents.length}{' '}
              {recentIntents.length === 1 ? 'checkout link' : 'checkout links'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={reconcileHash}
              onChange={(event) => setReconcileHash(event.target.value)}
              placeholder="Paste tx signature"
              className="h-9 w-full rounded-md border border-[#dfe4eb] bg-white px-3 font-mono text-xs font-semibold text-[#303642] outline-none transition focus:border-[#101114] focus:ring-2 focus:ring-[#101114]/10 sm:w-56"
            />
            <button
              type="button"
              onClick={exportCsv}
              disabled={recentIntents.length === 0}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-semibold text-[#303642] transition hover:border-[#c8d0dc] hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            {loadingRecent && (
              <Loader2 className="h-4 w-4 animate-spin text-[#737b8c]" />
            )}
          </div>
        </div>

        <div className="grid gap-3 p-5">
          {recentIntents.length === 0 ? (
            <div className="flex min-h-[128px] flex-col items-center justify-center rounded-lg border border-dashed border-[#d4dae3] bg-[#fbfcfd] p-8 text-center">
              <ReceiptText className="h-5 w-5 text-[#8b93a3]" />
              <p className="mt-2 text-sm font-semibold text-[#303642]">
                No checkout sales yet
              </p>
            </div>
          ) : (
            recentIntents.map((intent) => {
              const saleDate = formatSaleDate(intent.createdAt);
              const items = lineItemCount(intent);

              return (
                <div
                  key={intent.intentId}
                  className="flex flex-col gap-3 rounded-lg border border-[#edf0f3] bg-[#fbfcfd] p-4 transition hover:border-[#dfe4eb] hover:bg-white sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="max-w-full truncate text-sm font-semibold text-[#101114]">
                        {intent.description || intent.intentId}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone(
                          intent.status
                        )}`}
                      >
                        {statusLabel(intent.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#737b8c]">
                      <span className="font-mono font-semibold text-[#303642]">
                        {formatAmount(intent)}
                      </span>
                      <span>
                        {items} {items === 1 ? 'item' : 'items'}
                      </span>
                      <span>
                        Wallet{' '}
                        {truncateWalletAddress(intent.merchant.wallet.address)}
                      </span>
                      {saleDate ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {saleDate}
                        </span>
                      ) : null}
                      <span>{paymentRequestStatus(intent)}</span>
                      {intent.payment?.txHash ? (
                        <span className="font-mono">
                          Tx {truncateWalletAddress(intent.payment.txHash)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:flex sm:shrink-0 sm:items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedIntent(intent);
                        copyLink(phantomLinkForIntent(intent));
                      }}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-semibold text-[#303642] transition hover:border-[#c8d0dc] hover:bg-[#f7f8fa]"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Phantom
                    </button>
                    {canReconcileStatus(intent.status) ? (
                      <button
                        type="button"
                        onClick={() => handleReconcile(intent)}
                        disabled={reconcilingIntentId === intent.intentId}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-semibold text-[#303642] transition hover:border-[#c8d0dc] hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reconcilingIntentId === intent.intentId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {reconcileActionLabel(intent.status)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startRefund(intent)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-semibold text-[#303642] transition hover:border-[#c8d0dc] hover:bg-[#f7f8fa]"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Refund
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-[#e6e9ef] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#737b8c]">
            Detection
          </p>
          <p className="mt-1 text-sm font-semibold">
            {merchantStatus?.reconciliation.heliusWebhookConfigured
              ? 'Webhook active'
              : 'Manual signature fallback'}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#737b8c]">
            Every new QR includes a unique Solana Pay reference.
          </p>
        </div>
        <div className="rounded-lg border border-[#e6e9ef] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#737b8c]">
            Gas sponsorship
          </p>
          <p className="mt-1 text-sm font-semibold">
            {merchantStatus?.sponsorship.enabled
              ? 'Privy enabled'
              : 'Privy not configured'}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#737b8c]">
            Sponsored payments must pass backend transaction verification first.
          </p>
        </div>
        <div className="rounded-lg border border-[#e6e9ef] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#737b8c]">
            EVM payments
          </p>
          <p className="mt-1 text-sm font-semibold">
            {merchantStatus?.crossChain.lifiEnabled
              ? 'Same-chain USDC'
              : 'Solana only'}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#737b8c]">
            EVM tokens swap to USDC on that EVM chain; Solana tokens settle as Solana USDC.
          </p>
        </div>
      </section>

      {refundIntentId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-lg border border-[#dfe4eb] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Refund request</h2>
                <p className="mt-1 text-xs text-[#737b8c]">
                  Creates a Solana Pay URI for the merchant wallet to sign.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRefundIntentId(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dfe4eb]"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-4 flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
              Recipient wallet
              <input
                value={refundWallet}
                onChange={(event) => setRefundWallet(event.target.value)}
                className="h-10 rounded-md border border-[#dfe4eb] px-3 font-mono text-xs font-semibold normal-case tracking-normal outline-none focus:border-[#101114]"
              />
            </label>
            <label className="mt-3 flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
              Amount
              <input
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                inputMode="decimal"
                className="h-10 rounded-md border border-[#dfe4eb] px-3 font-mono text-sm font-semibold normal-case tracking-normal outline-none focus:border-[#101114]"
              />
            </label>
            <label className="mt-3 flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
              Reason
              <input
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                placeholder="Optional"
                className="h-10 rounded-md border border-[#dfe4eb] px-3 text-sm font-medium normal-case tracking-normal outline-none focus:border-[#101114]"
              />
            </label>
            <button
              type="button"
              onClick={submitRefund}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#101114] px-4 text-sm font-semibold text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Create refund URI
            </button>
          </div>
        </div>
      ) : null}

      {copyFallback ? (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-2xl rounded-lg border border-[#dfe4eb] bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#101114]">
                Copy manually
              </p>
              <p className="mt-1 text-xs text-[#737b8c]">
                Browser clipboard access was blocked, so the value is selected.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCopyFallback('')}
              className="inline-flex h-8 items-center justify-center rounded-md border border-[#dfe4eb] px-3 text-xs font-semibold"
            >
              Close
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              ref={copyFallbackInputRef}
              readOnly
              value={copyFallback}
              onFocus={(event) => event.currentTarget.select()}
              className="h-10 min-w-0 flex-1 rounded-md border border-[#dfe4eb] px-3 font-mono text-xs font-semibold outline-none focus:border-[#101114]"
            />
            <button
              type="button"
              onClick={() => {
                copyFallbackInputRef.current?.focus();
                copyFallbackInputRef.current?.select();
              }}
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#101114] px-4 text-sm font-semibold text-white"
            >
              Select
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
