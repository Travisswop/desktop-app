'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  Copy,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  CheckoutIntent,
  createCheckoutIntent,
  listCheckoutIntents,
} from '@/lib/checkout-api';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';
import { truncateWalletAddress } from '@/lib/tranacateWalletAddress';
import { useUser } from '@/lib/UserContext';

const API = process.env.NEXT_PUBLIC_API_URL;
const PLATFORM_FEE_BPS = 50;

type ProductRecord = {
  _id?: string;
  name: string;
  description?: string;
  image?: string;
  price: number | string;
  currency?: string;
  nftType?: string;
  mintLimit?: number;
  category?: 'physical' | 'digital';
};

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

function mapProduct(item: ProductRecord): ProductRow {
  return {
    id: item._id || `${item.nftType || 'product'}-${item.name}`,
    name: item.name || 'Untitled product',
    description: item.description || '',
    image: item.image || '',
    price: Number(item.price) || 0,
    currency: (item.currency || 'USDC').toUpperCase(),
    productType: item.nftType || '',
    stock: item.mintLimit,
  };
}

export default function CheckoutCreateClient() {
  const { user, accessToken } = useUser();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [search, setSearch] = useState('');
  const [merchantWalletAddress, setMerchantWalletAddress] = useState('');
  const [createdIntent, setCreatedIntent] = useState<CheckoutIntent | null>(
    null
  );
  const [recentIntents, setRecentIntents] = useState<CheckoutIntent[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [creating, setCreating] = useState(false);
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

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.product.price * item.quantity,
        0
      ),
    [cartItems]
  );
  const estimatedFee = useMemo(
    () => Number((subtotal * (PLATFORM_FEE_BPS / 10000)).toFixed(6)),
    [subtotal]
  );
  const estimatedPayerTotal = useMemo(
    () => Number((subtotal + estimatedFee).toFixed(6)),
    [estimatedFee, subtotal]
  );

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
      const response = await fetch(`${API}/api/v2/desktop/nft/listByUser`, {
        method: 'GET',
        headers: { authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`products ${response.status}`);
      const payload = (await response.json()) as { data?: ProductRecord[] };
      setProducts((payload.data || []).map(mapProduct));
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

  useEffect(() => {
    loadProducts();
    loadRecent();
  }, [loadProducts, loadRecent]);

  const addProduct = (product: ProductRow) => {
    setCreatedIntent(null);
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
    if (!accessToken || cartItems.length === 0) return;

    setCreating(true);
    try {
      const intent = await createCheckoutIntent(
        {
          lineItems: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          merchantWalletAddress,
          merchantCurrency: 'USDC',
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
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Checkout link copied');
    window.setTimeout(() => setCopied(false), 1600);
  };

  const startNewSale = () => {
    setCart({});
    setCreatedIntent(null);
    setCopied(false);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-[#101114]">
            Checkout
          </h1>
          <p className="mt-1 text-sm text-[#646b78]">
            Build a product sale, generate the QR, and let the payer choose the
            currency on their device.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              loadProducts();
              loadRecent();
            }}
            disabled={loadingProducts || loadingRecent}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dde1e6] bg-white px-3 text-sm font-semibold text-[#303642] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingProducts || loadingRecent ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
          <button
            type="button"
            onClick={startNewSale}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#101114] px-3 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            New sale
          </button>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#101114]">
                Products
              </h2>
              <p className="mt-1 text-xs font-medium text-[#737b8c]">
                {visibleProducts.length} available for USDC checkout
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b93a3]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products"
                className="h-10 w-full rounded-md border border-[#dde1e6] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#101114]"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {loadingProducts ? (
              <div className="col-span-full flex items-center gap-3 py-10 text-sm text-[#646b78]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading products...
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="col-span-full rounded-md border border-dashed border-[#cfd5dd] p-8 text-center text-sm text-[#737b8c]">
                No priced USDC products found.
              </div>
            ) : (
              visibleProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product)}
                  className="flex min-h-[132px] flex-col justify-between rounded-lg border border-[#edf0f3] bg-white p-3 text-left transition hover:border-[#101114]"
                >
                  <div className="flex gap-3">
                    {product.image ? (
                      <Image
                        src={sanitizeNextImageSrc(product.image)}
                        alt={product.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#f0f2f5]">
                        <Package className="h-5 w-5 text-[#737b8c]" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold text-[#101114]">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-[#737b8c]">
                        {product.productType || 'Product'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">
                      {toMoney(product.price, product.currency)}
                    </span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#101114] text-white">
                      <Plus className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <aside className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#101114]">
                Current sale
              </h2>
              <p className="mt-1 text-xs font-medium text-[#737b8c]">
                {cartItems.length}{' '}
                {cartItems.length === 1 ? 'product' : 'products'}
              </p>
            </div>
            <ShoppingCart className="h-5 w-5 text-[#737b8c]" />
          </div>

          <div className="mt-4 max-h-[290px] overflow-y-auto rounded-md border border-[#edf0f3]">
            {cartItems.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#737b8c]">
                Select products to start a sale.
              </div>
            ) : (
              <div className="divide-y divide-[#edf0f3]">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#101114]">
                          {item.product.name}
                        </p>
                        <p className="mt-1 text-xs text-[#737b8c]">
                          {toMoney(item.product.price, item.product.currency)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuantity(item.product.id, 0)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#737b8c] hover:bg-[#f5f6f8]"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-md border border-[#dde1e6]">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(item.product.id, item.quantity - 1)
                          }
                          className="inline-flex h-8 w-8 items-center justify-center"
                          title="Decrease"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-8 px-2 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(item.product.id, item.quantity + 1)
                          }
                          className="inline-flex h-8 w-8 items-center justify-center"
                          title="Increase"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">
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

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#737b8c]">Merchant receives</dt>
              <dd className="font-semibold">{toMoney(subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#737b8c]">Checkout fee</dt>
              <dd className="font-semibold">{toMoney(estimatedFee)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[#edf0f3] pt-3">
              <dt className="font-semibold text-[#303642]">Payer total</dt>
              <dd className="font-semibold">{toMoney(estimatedPayerTotal)}</dd>
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
                className="h-10 w-full rounded-md border border-[#dde1e6] pl-9 pr-3 text-sm font-medium normal-case tracking-normal outline-none focus:border-[#101114]"
                placeholder="Solana wallet address"
                required
              />
            </div>
          </label>

          <button
            type="button"
            onClick={handleCreate}
            disabled={
              creating ||
              !accessToken ||
              cartItems.length === 0 ||
              !merchantWalletAddress
            }
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#101114] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create QR
          </button>

          {createdIntent ? (
            <div className="mt-5 rounded-lg border border-[#d8f5e4] bg-[#fbfffd] p-4">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-lg border border-[#dde1e6] bg-white p-3">
                  <QRCodeSVG
                    value={createdIntent.checkoutUrl}
                    size={216}
                    bgColor="#ffffff"
                    fgColor="#101114"
                    level="M"
                  />
                </div>
                <div className="w-full rounded-md border border-[#edf0f3] bg-white p-3 text-sm">
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
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#dde1e6] bg-white px-3 text-sm font-semibold text-[#303642]"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy link
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#101114]">
            Recent sales
          </h2>
          {loadingRecent && (
            <Loader2 className="h-4 w-4 animate-spin text-[#737b8c]" />
          )}
        </div>
        <div className="mt-4 divide-y divide-[#edf0f3]">
          {recentIntents.length === 0 ? (
            <p className="py-5 text-sm text-[#737b8c]">
              No checkout sales yet.
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
                    {intent.lineItems?.length || 0}{' '}
                    {(intent.lineItems?.length || 0) === 1 ? 'item' : 'items'} ·{' '}
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
