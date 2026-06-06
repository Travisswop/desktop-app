'use client';

import { useRouter } from 'next/navigation';
import {
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Download, FileText, Lock } from 'lucide-react';
import {
  Avatar,
  Card,
  DeliveryPill,
  Mono,
  ScreenShell,
  ghostBtn,
  hair,
  hair2,
  ink,
  inputStyle,
  mono,
  muted,
  posGreen,
  primaryBtn,
} from '@/components/mint/design-system';
import Image from 'next/image';

export interface OrderLine {
  productId: string | null;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
  digitalAsset?: DigitalAsset | null;
}

export interface DigitalAsset {
  enabled?: boolean;
  fileName?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
  accessPolicy?: 'receipt_nft';
}

export interface Counterparty {
  id: string | null;
  name?: string;
  email?: string;
  phone?: string;
  wallet?: { ens?: string; address?: string } | null;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;
  avatar: string;
}

export interface OrderDetail {
  orderId: string;
  _id: string;
  orderDate: string;
  delivery: string;
  payment?: string;
  chain: 'USDC' | 'SOL';
  status?: string;
  orderType?: string;
  checkoutMode?: string;
  financial?: {
    subtotal?: number;
    shippingCost?: number;
    totalCost?: number;
    currency?: string;
  };
  counterparty: Counterparty | null;
  lines: OrderLine[];
  userRole: 'buyer' | 'seller' | null;
  receipt?: {
    receiptId?: string | null;
    status?: string;
    mintAddress?: string | null;
    txHash?: string | null;
    metadataUri?: string | null;
    error?: string | null;
    mintedAt?: string | null;
  };
  settlement?: {
    policy?: string;
    status?: string;
    amount?: number;
    currency?: string;
    grossAmount?: number;
    platformFeeBps?: number;
    platformFeeAmount?: number;
    merchantReceivesAmount?: number;
    recipientAddress?: string;
    txHash?: string | null;
    releasedAt?: string | null;
    releaseReason?: string;
    mode?: string;
    error?: string | null;
  };
  fulfillment?: {
    status?: string;
    requiresShipping?: boolean;
    trackingNumber?: string;
    carrier?: string;
    estimatedDeliveryDate?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    receiptConfirmedAt?: string | null;
    releaseConditions?: {
      shippingConfirmed?: boolean;
      customerReceiptConfirmed?: boolean;
    };
  };
  processingStages?: Array<{
    stage: string;
    timestamp: string;
    status: string;
  }>;
}

const GLYPHS = ['◧', '◇', '◯', '⬢', '✶', '△'];
const SWATCHES = ['#F2E0DC', '#FBE7C6', '#D7EAD9', '#D6E4F2', '#EAE2F4', '#F4E1E1'];

const swatchFor = (i: number) => SWATCHES[i % SWATCHES.length];
const glyphFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return GLYPHS[h % GLYPHS.length];
};

const formatDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const formatTime = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${formatDate(iso)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const dateInputValue = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const humanize = (value?: string | null) =>
  String(value || '—')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const shortHash = (value?: string | null) => {
  if (!value) return '—';
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
};

const money = (value?: number, currency = 'USDC') =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(2)} ${currency}`
    : '—';

const fileSize = (bytes?: number) => {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 KB';
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const buttonStyle = (base: CSSProperties, disabled?: boolean): CSSProperties => ({
  ...base,
  padding: '12px 32px',
  borderRadius: 12,
  opacity: disabled ? 0.55 : 1,
  cursor: disabled ? 'not-allowed' : base.cursor,
});

type ShippingDraft = {
  status: string;
  trackingNumber: string;
  carrier: string;
  estimatedDeliveryDate: string;
  note: string;
};

type PaymentDraft = {
  method: 'wallet' | 'stripe';
  txHash: string;
  paymentIntentId: string;
};

type DetailTab =
  | 'Order History'
  | 'Customer Details'
  | 'Buyer Details'
  | 'Order Description'
  | 'Options';

export default function OrderDetailScreen({
  order,
  backHref = '/order',
  actionLoading = false,
  actionError,
  onCompletePayment,
  onUpdateShipping,
  onConfirmReceipt,
  onDownloadDigitalAsset,
}: {
  order: OrderDetail;
  backHref?: string;
  actionLoading?: boolean;
  actionError?: string | null;
  onCompletePayment?: (payload: {
    method: 'wallet' | 'stripe';
    txHash?: string;
    paymentIntentId?: string;
  }) => Promise<void>;
  onUpdateShipping?: (payload: {
    status: string;
    trackingNumber?: string;
    carrier?: string;
    estimatedDeliveryDate?: string;
    note?: string;
  }) => Promise<void>;
  onConfirmReceipt?: (payload: {
    rating?: number;
    feedback?: string;
  }) => Promise<void>;
  onDownloadDigitalAsset?: (line: OrderLine) => Promise<void>;
}) {
  const router = useRouter();
  const isBuyerCtx = order.userRole === 'buyer';
  const detailsLabel: DetailTab = isBuyerCtx ? 'Buyer Details' : 'Customer Details';
  const digitalLines = useMemo(
    () => order.lines.filter((line) => line.digitalAsset?.enabled),
    [order.lines]
  );
  const tabs: DetailTab[] = [
    'Order History',
    detailsLabel,
    'Order Description',
    ...(digitalLines.length ? (['Options'] as DetailTab[]) : []),
  ];
  const [tab, setTab] = useState<DetailTab>('Order History');
  const [downloadingProductId, setDownloadingProductId] = useState<string | null>(
    null
  );
  const [shippingOpen, setShippingOpen] = useState(false);
  const [shippingDraft, setShippingDraft] = useState({
    status: order.fulfillment?.status === 'not_required'
      ? 'processing'
      : order.fulfillment?.status || 'processing',
    trackingNumber: order.fulfillment?.trackingNumber || '',
    carrier: order.fulfillment?.carrier || '',
    estimatedDeliveryDate: dateInputValue(order.fulfillment?.estimatedDeliveryDate),
    note: '',
  });
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState<{
    method: 'wallet' | 'stripe';
    txHash: string;
    paymentIntentId: string;
  }>({
    method: 'wallet',
    txHash: '',
    paymentIntentId: '',
  });

  const lineSubtotal = useMemo(
    () => order.lines.reduce((acc, l) => acc + l.price * l.quantity, 0),
    [order.lines]
  );
  const total = order.financial?.totalCost ?? lineSubtotal;
  const paymentComplete = order.payment === 'completed';
  const requiresShipping = Boolean(order.fulfillment?.requiresShipping);
  const receiptConfirmed = Boolean(
    order.fulfillment?.receiptConfirmedAt ||
      order.fulfillment?.status === 'receipt_confirmed'
  );
  const canConfirmReceipt =
    isBuyerCtx && requiresShipping && paymentComplete && !receiptConfirmed;
  const canUpdateShipping =
    !isBuyerCtx && requiresShipping && paymentComplete && Boolean(onUpdateShipping);
  const canCompletePayment =
    isBuyerCtx && !paymentComplete && Boolean(onCompletePayment);
  const canDownloadDigitalAssets =
    isBuyerCtx && paymentComplete && order.receipt?.status === 'minted';
  const digitalDownloadReason = !isBuyerCtx
    ? 'Only the buyer can download purchased files.'
    : !paymentComplete
    ? 'Download unlocks after payment is complete.'
    : order.receipt?.status !== 'minted'
    ? 'Download unlocks after the receipt NFT is minted.'
    : '';

  const submitShipping = async () => {
    if (!onUpdateShipping) return;
    try {
      await onUpdateShipping({
        status: shippingDraft.status,
        trackingNumber: shippingDraft.trackingNumber || undefined,
        carrier: shippingDraft.carrier || undefined,
        estimatedDeliveryDate: shippingDraft.estimatedDeliveryDate || undefined,
        note: shippingDraft.note || undefined,
      });
      setShippingOpen(false);
    } catch {
      // The parent surfaces the backend error inline.
    }
  };

  const submitPayment = async () => {
    if (!onCompletePayment) return;
    try {
      await onCompletePayment({
        method: paymentDraft.method,
        txHash:
          paymentDraft.method === 'wallet'
            ? paymentDraft.txHash.trim()
            : undefined,
        paymentIntentId:
          paymentDraft.method === 'stripe'
            ? paymentDraft.paymentIntentId.trim()
            : undefined,
      });
      setPaymentOpen(false);
    } catch {
      // The parent surfaces the backend error inline.
    }
  };

  const downloadDigitalLine = async (line: OrderLine) => {
    if (!onDownloadDigitalAsset || !line.productId || !canDownloadDigitalAssets) {
      return;
    }

    setDownloadingProductId(line.productId);
    try {
      await onDownloadDigitalAsset(line);
    } finally {
      setDownloadingProductId(null);
    }
  };

  return (
    <ScreenShell
      onBack={() => router.push(backHref)}
      eyebrow="Orders"
      title={`Order #${order.orderId}`}
      kicker={`Placed ${formatDate(order.orderDate)} · ${
        order.counterparty?.name ?? '—'
      } · ${isBuyerCtx ? 'Purchases' : 'Sold'}`}
    >
      {/* Total + Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14 }}>
        <Card pad={20}>
          <div style={{ fontSize: 12, color: muted, fontWeight: 500 }}>Total Order</div>
          <div style={{ marginTop: 16 }}>
            <Mono
              size={42}
              weight={600}
              color={posGreen}
              style={{ letterSpacing: -1 }}
            >
              {order.lines.reduce((a, l) => a + l.quantity, 0).toLocaleString()}
            </Mono>
          </div>
        </Card>
        <Card pad={20}>
          <div
            style={{
              fontSize: 12,
              color: muted,
              fontWeight: 500,
              marginBottom: 14,
            }}
          >
            {isBuyerCtx ? 'Purchases Overview' : 'Payments Overview'}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0,
            }}
          >
            <Cell label="Subtotal" value={`$${(order.financial?.subtotal ?? lineSubtotal).toFixed(2)}`} mono em />
            <Cell
              label="Shipping"
              value={`$${(order.financial?.shippingCost ?? 0).toFixed(2)}`}
              mono
            />
            <Cell label="Total" value={`$${total.toFixed(2)}`} mono em />
            <Cell label="Chain" value={order.chain} />
          </div>
        </Card>
      </div>

      {/* Order summary card */}
      <Card pad={0}>
        <div
          style={{
            padding: '22px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            borderBottom: `1px solid ${hair2}`,
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 12,
              background: '#f0f0ee',
              border: `1px solid ${hair2}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {order.lines[0]?.image ? (
              <Image
                src={order.lines[0].image}
                alt={order.lines[0].name}
                width={68}
                height={68}
                style={{ objectFit: 'cover', width: 68, height: 68 }}
              />
            ) : (
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#666"
                strokeWidth="1.4"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 8h18" />
                <path d="M8 3v5" />
              </svg>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                color: muted,
                fontFamily: mono,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Order
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: -0.4,
                color: ink,
              }}
            >
              Order #{order.orderId}
            </div>
          </div>
          {isBuyerCtx && (
            <div style={{ position: 'absolute', top: 16, right: 16 }}>
              <DeliveryPill status={order.delivery} />
            </div>
          )}
        </div>

        {/* Items table */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            padding: '14px 24px',
            borderBottom: `1px solid ${hair2}`,
            fontSize: 11,
            color: muted,
            fontWeight: 500,
          }}
        >
          <div>Product Name</div>
          <div style={{ textAlign: 'center' }}>Quantity</div>
          <div style={{ textAlign: 'right' }}>Price</div>
        </div>
        {order.lines.map((line, i) => (
          <div
            key={`${line.productId}-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              padding: '16px 24px',
              borderBottom:
                i < order.lines.length - 1 ? `1px solid ${hair2}` : 'none',
              alignItems: 'center',
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: swatchFor(i),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: ink,
                  overflow: 'hidden',
                }}
              >
                {line.image ? (
                  <Image
                    src={line.image}
                    alt={line.name}
                    width={28}
                    height={28}
                    style={{ objectFit: 'cover', width: 28, height: 28 }}
                  />
                ) : (
                  glyphFor(line.name)
                )}
              </div>
              <div style={{ fontWeight: 500 }}>{line.name}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Mono size={13}>{line.quantity}</Mono>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Mono size={13} weight={500}>
                ${line.price.toFixed(2)}
              </Mono>
            </div>
          </div>
        ))}

        {/* Action buttons */}
        <div
          style={{
            padding: '20px 24px',
            borderTop: `1px solid ${hair2}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {actionError ? (
            <div
              style={{
                width: '100%',
                border: '1px solid rgba(185,28,28,0.18)',
                background: 'rgba(185,28,28,0.06)',
                color: '#b91c1c',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              {actionError}
            </div>
          ) : null}

          {isBuyerCtx ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              {canCompletePayment ? (
                <button
                  type="button"
                  onClick={() => setPaymentOpen((value) => !value)}
                  disabled={actionLoading}
                  style={buttonStyle(primaryBtn, actionLoading)}
                >
                  Submit Payment
                </button>
              ) : null}
              {requiresShipping ? (
                <button
                  type="button"
                  disabled={!canConfirmReceipt || actionLoading}
                  onClick={() => {
                    if (!onConfirmReceipt || !canConfirmReceipt) return;
                    void onConfirmReceipt({}).catch(() => undefined);
                  }}
                  style={buttonStyle(ghostBtn, !canConfirmReceipt || actionLoading)}
                >
                  Confirm Receipt
                </button>
              ) : null}
              <button
                type="button"
                style={{ ...primaryBtn, padding: '12px 32px', borderRadius: 12 }}
              >
                Dispute
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canUpdateShipping || actionLoading}
              onClick={() => setShippingOpen((value) => !value)}
              style={buttonStyle(ghostBtn, !canUpdateShipping || actionLoading)}
            >
              Update Shipping
            </button>
          )}

          {paymentOpen ? (
            <InlinePaymentForm
              draft={paymentDraft}
              setDraft={setPaymentDraft}
              onSubmit={submitPayment}
              loading={actionLoading}
            />
          ) : null}

          {shippingOpen ? (
            <InlineShippingForm
              draft={shippingDraft}
              setDraft={setShippingDraft}
              onSubmit={submitShipping}
              loading={actionLoading}
            />
          ) : null}
        </div>
      </Card>

      <OrderStateCards order={order} />

      {/* Tabs */}
      <div>
        <div
          style={{
            display: 'flex',
            gap: 28,
            borderBottom: `1px solid ${hair}`,
            marginBottom: 16,
          }}
        >
          {tabs.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  background: 'transparent',
                  border: 0,
                  padding: '6px 0 12px',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? ink : muted,
                  borderBottom: active
                    ? `2px solid ${ink}`
                    : '2px solid transparent',
                  marginBottom: -1,
                  fontFamily: 'inherit',
                  letterSpacing: -0.1,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {tab === 'Order History' && <OrderHistory order={order} isBuyer={isBuyerCtx} />}
        {(tab === 'Customer Details' || tab === 'Buyer Details') && (
          <CounterpartyDetails counterparty={order.counterparty} buyer={isBuyerCtx} />
        )}
        {tab === 'Order Description' && <OrderDescription order={order} />}
        {tab === 'Options' && (
          <OrderOptions
            lines={digitalLines}
            canDownload={canDownloadDigitalAssets}
            blockedReason={digitalDownloadReason}
            downloadingProductId={downloadingProductId}
            onDownload={downloadDigitalLine}
          />
        )}
      </div>
    </ScreenShell>
  );
}

function InlinePaymentForm({
  draft,
  setDraft,
  onSubmit,
  loading,
}: {
  draft: PaymentDraft;
  setDraft: Dispatch<SetStateAction<PaymentDraft>>;
  onSubmit: () => Promise<void>;
  loading: boolean;
}) {
  const needsWalletHash = draft.method === 'wallet';
  const disabled =
    loading ||
    (needsWalletHash
      ? !draft.txHash.trim()
      : !draft.paymentIntentId.trim());

  return (
    <div style={inlinePanelStyle}>
      <div style={fieldGridStyle}>
        <label style={inlineFieldStyle}>
          <span style={inlineLabelStyle}>Method</span>
          <select
            value={draft.method}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                method: event.target.value as 'wallet' | 'stripe',
              }))
            }
            style={inputStyle as CSSProperties}
          >
            <option value="wallet">Wallet</option>
            <option value="stripe">Stripe</option>
          </select>
        </label>
        {needsWalletHash ? (
          <label style={inlineFieldStyle}>
            <span style={inlineLabelStyle}>Transaction hash</span>
            <input
              value={draft.txHash}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  txHash: event.target.value,
                }))
              }
              placeholder="Paste wallet transaction hash"
              style={inputStyle as CSSProperties}
            />
          </label>
        ) : (
          <label style={inlineFieldStyle}>
            <span style={inlineLabelStyle}>Payment intent</span>
            <input
              value={draft.paymentIntentId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  paymentIntentId: event.target.value,
                }))
              }
              placeholder="pi_..."
              style={inputStyle as CSSProperties}
            />
          </label>
        )}
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        style={buttonStyle(primaryBtn, disabled)}
      >
        Submit Payment
      </button>
    </div>
  );
}

function InlineShippingForm({
  draft,
  setDraft,
  onSubmit,
  loading,
}: {
  draft: ShippingDraft;
  setDraft: Dispatch<SetStateAction<ShippingDraft>>;
  onSubmit: () => Promise<void>;
  loading: boolean;
}) {
  return (
    <div style={inlinePanelStyle}>
      <div style={fieldGridStyle}>
        <label style={inlineFieldStyle}>
          <span style={inlineLabelStyle}>Status</span>
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft((current) => ({ ...current, status: event.target.value }))
            }
            style={inputStyle as CSSProperties}
          >
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="out_for_delivery">Out for delivery</option>
            <option value="delivered">Delivered</option>
          </select>
        </label>
        <label style={inlineFieldStyle}>
          <span style={inlineLabelStyle}>Tracking</span>
          <input
            value={draft.trackingNumber}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                trackingNumber: event.target.value,
              }))
            }
            placeholder="Tracking number"
            style={inputStyle as CSSProperties}
          />
        </label>
        <label style={inlineFieldStyle}>
          <span style={inlineLabelStyle}>Carrier</span>
          <input
            value={draft.carrier}
            onChange={(event) =>
              setDraft((current) => ({ ...current, carrier: event.target.value }))
            }
            placeholder="UPS, USPS, FedEx..."
            style={inputStyle as CSSProperties}
          />
        </label>
        <label style={inlineFieldStyle}>
          <span style={inlineLabelStyle}>ETA</span>
          <input
            type="date"
            value={draft.estimatedDeliveryDate}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                estimatedDeliveryDate: event.target.value,
              }))
            }
            style={inputStyle as CSSProperties}
          />
        </label>
      </div>
      <label style={inlineFieldStyle}>
        <span style={inlineLabelStyle}>Note</span>
        <input
          value={draft.note}
          onChange={(event) =>
            setDraft((current) => ({ ...current, note: event.target.value }))
          }
          placeholder="Optional shipping note"
          style={inputStyle as CSSProperties}
        />
      </label>
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        style={buttonStyle(primaryBtn, loading)}
      >
        Save Shipping
      </button>
    </div>
  );
}

function OrderStateCards({ order }: { order: OrderDetail }) {
  const receipt = order.receipt;
  const settlement = order.settlement;
  const fulfillment = order.fulfillment;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Card pad={20}>
        <div style={stateTitleStyle}>Receipt NFT</div>
        <div style={stateGridStyle}>
          <StateRow label="Status" value={humanize(receipt?.status)} />
          <StateRow label="Mint" value={shortHash(receipt?.mintAddress)} mono />
          <StateRow label="Tx" value={shortHash(receipt?.txHash)} mono />
          <StateRow label="Metadata" value={shortHash(receipt?.metadataUri)} mono />
          <StateRow label="Minted" value={formatTime(receipt?.mintedAt || '') || '—'} />
          <StateRow label="Error" value={receipt?.error || '—'} />
        </div>
      </Card>
      <Card pad={20}>
        <div style={stateTitleStyle}>Settlement & Tracking</div>
        <div style={stateGridStyle}>
          <StateRow label="Policy" value={humanize(settlement?.policy)} />
          <StateRow label="Settlement" value={humanize(settlement?.status)} />
          <StateRow
            label="Merchant receives"
            value={money(
              settlement?.merchantReceivesAmount,
              settlement?.currency || order.financial?.currency || 'USDC'
            )}
            mono
          />
          <StateRow label="Release tx" value={shortHash(settlement?.txHash)} mono />
          <StateRow label="Fulfillment" value={humanize(fulfillment?.status)} />
          <StateRow label="Tracking" value={shortHash(fulfillment?.trackingNumber)} mono />
          <StateRow label="Carrier" value={fulfillment?.carrier || '—'} />
          <StateRow
            label="Receipt confirmed"
            value={formatTime(fulfillment?.receiptConfirmedAt || '') || '—'}
          />
        </div>
      </Card>
    </div>
  );
}

function StateRow({
  label,
  value,
  mono: isMono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, color: muted, marginBottom: 4, fontWeight: 500 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: ink,
          fontWeight: 600,
          fontFamily: isMono ? mono : 'inherit',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </div>
  );
}

const inlinePanelStyle: CSSProperties = {
  width: '100%',
  border: `1px solid ${hair2}`,
  background: '#fafafa',
  borderRadius: 10,
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const fieldGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 10,
  width: '100%',
};

const inlineFieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const inlineLabelStyle: CSSProperties = {
  fontSize: 11,
  color: muted,
  fontWeight: 600,
  textTransform: 'uppercase',
  fontFamily: mono,
};

const stateTitleStyle: CSSProperties = {
  fontSize: 12,
  color: muted,
  fontWeight: 600,
  marginBottom: 14,
};

const stateGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 14,
};

const Cell = ({
  label,
  value,
  mono: isMono,
  em,
}: {
  label: string;
  value: string;
  mono?: boolean;
  em?: boolean;
}) => (
  <div style={{ paddingRight: 16 }}>
    <div style={{ fontSize: 11, color: muted, marginBottom: 8, fontWeight: 500 }}>
      {label}
    </div>
    {isMono ? (
      <Mono size={em ? 16 : 14} weight={600} color={em ? posGreen : ink}>
        {value}
      </Mono>
    ) : (
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
    )}
  </div>
);

const HISTORY_TONE: Record<string, string> = {
  Completed: posGreen,
  Arrived: posGreen,
  Complete: posGreen,
  Delivered: posGreen,
  Settled: posGreen,
  'In Review': '#b45309',
  'In Transit': '#b45309',
  Pending: '#b45309',
  Processing: '#b45309',
  Cancel: '#b91c1c',
  Refunded: '#b91c1c',
};

function OrderHistory({
  order,
  isBuyer,
}: {
  order: OrderDetail;
  isBuyer: boolean;
}) {
  const actualEvents = (order.processingStages || []).map((stage) => ({
    label: humanize(stage.stage),
    status: humanize(stage.status),
    when: formatTime(stage.timestamp),
    done: stage.status === 'completed',
  }));

  const events = actualEvents.length
    ? actualEvents
    : isBuyer
    ? [
        {
          label: 'Payment Status',
          status: order.payment === 'completed' ? 'Completed' : 'Pending',
          when: formatTime(order.orderDate),
          done: order.payment === 'completed',
        },
        {
          label: 'Tracking Status',
          status: order.delivery === 'Delivered' ? 'Arrived' : 'In Transit',
          when: formatTime(order.orderDate),
          done: order.delivery === 'Delivered',
        },
        {
          label: 'Order Status',
          status: order.delivery === 'Delivered' ? 'Completed' : order.delivery,
          when: formatDate(order.orderDate),
          done: order.delivery === 'Delivered',
        },
      ]
    : [
        {
          label: 'Payment Status',
          status: order.payment === 'completed' ? 'Settled' : 'In Review',
          when: formatTime(order.orderDate),
          done: order.payment === 'completed',
          sub: 'Funds held in escrow until shipping is confirmed.',
        },
        {
          label: 'Tracking Status',
          status: order.delivery === 'Complete' ? 'Arrived' : 'In Transit',
          when: formatTime(order.orderDate),
          done: order.delivery === 'Complete',
          sub: `Expected delivery: ${formatDate(order.orderDate)}`,
        },
        {
          label: 'Order Status',
          status: order.delivery,
          when:
            order.delivery === 'Complete' ? formatDate(order.orderDate) : 'TBD',
          done: order.delivery === 'Complete',
        },
      ];

  const toneFor = (s: string) => HISTORY_TONE[s] || muted;

  return (
    <Card pad={24}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {events.map((ev, i) => {
          const color = toneFor(ev.status);
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr auto',
                gap: 14,
                paddingBottom: i < events.length - 1 ? 22 : 0,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    background: ev.done ? color : '#fff',
                    border: `2px solid ${ev.done ? color : hair}`,
                    marginTop: 2,
                  }}
                />
                {i < events.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      width: 2,
                      background: ev.done ? color : hair,
                      marginTop: 4,
                      opacity: ev.done ? 0.3 : 1,
                    }}
                  />
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>
                  {ev.label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color,
                    fontWeight: 500,
                    marginTop: 4,
                    fontFamily: mono,
                  }}
                >
                  {ev.status}
                </div>
                {'sub' in ev && ev.sub ? (
                  <div style={{ fontSize: 11.5, color: muted, marginTop: 4 }}>
                    {ev.sub}
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: muted,
                  fontFamily: mono,
                  whiteSpace: 'nowrap',
                  paddingTop: 2,
                }}
              >
                {ev.when}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CounterpartyDetails({
  counterparty,
  buyer,
}: {
  counterparty: Counterparty | null;
  buyer: boolean;
}) {
  if (!counterparty) {
    return (
      <Card pad={24}>
        <div style={{ fontSize: 13, color: muted }}>No counterparty details.</div>
      </Card>
    );
  }

  const fullAddress = [
    counterparty.address?.line1,
    counterparty.address?.line2,
    counterparty.address?.city,
    counterparty.address?.state,
    counterparty.address?.postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  const walletShort = counterparty.wallet?.address
    ? `${counterparty.wallet.address.slice(0, 6)}…${counterparty.wallet.address.slice(-4)}`
    : '—';

  const rows: Array<{ l: string; v: string; mono?: boolean }> = [
    { l: 'Name', v: counterparty.name || '—' },
    { l: 'Email', v: counterparty.email || '—' },
    { l: 'Phone', v: counterparty.phone || '—' },
    { l: 'Address', v: fullAddress || '—' },
    { l: 'Wallet', v: walletShort, mono: true },
  ];

  return (
    <Card pad={24}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <Avatar size={42} bg="#dfe6ef">
          {counterparty.avatar}
        </Avatar>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {counterparty.name || 'Anonymous'}
          </div>
          <div style={{ fontSize: 12, color: muted }}>
            {buyer ? 'Buyer' : 'Customer'} · order counterparty
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" style={ghostBtn}>
          Send message
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 32,
          rowGap: 18,
        }}
      >
        {rows.map((r) => (
          <div key={r.l}>
            <div
              style={{
                fontSize: 11,
                color: muted,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              {r.l}
            </div>
            <div
              style={{
                fontSize: 13,
                color: ink,
                fontWeight: 500,
                fontFamily: r.mono ? mono : 'inherit',
                wordBreak: 'break-word',
              }}
            >
              {r.v}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OrderOptions({
  lines,
  canDownload,
  blockedReason,
  downloadingProductId,
  onDownload,
}: {
  lines: OrderLine[];
  canDownload: boolean;
  blockedReason: string;
  downloadingProductId: string | null;
  onDownload: (line: OrderLine) => Promise<void>;
}) {
  if (!lines.length) {
    return (
      <Card pad={24}>
        <div style={{ fontSize: 13, color: muted }}>
          No digital downloads on this order.
        </div>
      </Card>
    );
  }

  return (
    <Card pad={24}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: '#f0f0ee',
            border: `1px solid ${hair}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ink,
          }}
        >
          {canDownload ? <Download size={17} /> : <Lock size={17} />}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 650, color: ink }}>
            Digital downloads
          </div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
            {canDownload
              ? 'Receipt NFT verified for this order.'
              : blockedReason || 'Receipt NFT verification required.'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lines.map((line, index) => {
          const loading = downloadingProductId === line.productId;
          const disabled = !canDownload || !line.productId || loading;
          return (
            <div
              key={`${line.productId || line.name}-${index}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                alignItems: 'center',
                border: `1px solid ${hair2}`,
                borderRadius: 12,
                background: '#fafafa',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#fff',
                    border: `1px solid ${hair}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: ink,
                  }}
                >
                  <FileText size={17} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: ink,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {line.digitalAsset?.fileName ||
                      line.digitalAsset?.originalName ||
                      line.name}
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 11.5,
                      color: muted,
                      fontFamily: mono,
                    }}
                  >
                    {line.name} · {fileSize(line.digitalAsset?.size)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  void onDownload(line);
                }}
                style={buttonStyle(primaryBtn, disabled)}
              >
                {loading ? 'Downloading...' : 'Download'}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function OrderDescription({ order }: { order: OrderDetail }) {
  const first = order.lines[0];
  if (!first) {
    return (
      <Card pad={24}>
        <div style={{ fontSize: 13, color: muted }}>
          No item description available.
        </div>
      </Card>
    );
  }
  return (
    <Card pad={24}>
      <div style={{ fontSize: 13, color: ink, lineHeight: 1.7, maxWidth: 760 }}>
        {first.name} — {order.lines.length} line{order.lines.length === 1 ? '' : 's'},{' '}
        {order.lines.reduce((a, l) => a + l.quantity, 0)} unit
        {order.lines.reduce((a, l) => a + l.quantity, 0) === 1 ? '' : 's'} total.
        Description and metadata are sourced from the seller&apos;s product snapshot
        for this order.
      </div>
      <div style={{ height: 1, background: hair2, margin: '20px 0' }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 22,
        }}
      >
        <KV label="Order ID" value={order.orderId} />
        <KV label="Placed" value={formatDate(order.orderDate)} />
        <KV label="Payment" value={order.payment || '—'} />
        <KV label="Delivery" value={order.delivery} />
        <KV label="Chain" value={order.chain} />
        <KV
          label="Line items"
          value={order.lines.length.toString()}
        />
      </div>
    </Card>
  );
}

const KV = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div style={{ fontSize: 11, color: muted, fontWeight: 500, marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: 13, color: ink, fontWeight: 500 }}>{value}</div>
  </div>
);
