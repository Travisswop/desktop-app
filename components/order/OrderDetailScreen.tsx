'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useUser } from '@/lib/UserContext';
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
  mono,
  muted,
  posGreen,
  primaryBtn,
} from '@/components/mint/design-system';
import { ShippingUpdateModal } from '@/components/order/orderId/components/ShippingUpdateModal';
import { useShippingUpdate } from '@/components/order/orderId/hooks/useShippingUpdate';
import type { ShippingUpdateData } from '@/components/order/orderId/types/order.types';
import Image from 'next/image';

export interface OrderLine {
  templateId: string | null;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
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
  financial?: {
    subtotal?: number;
    shippingCost?: number;
    totalCost?: number;
  };
  shipping?: {
    trackingNumber?: string;
    provider?: string;
    estimatedDeliveryDate?: string;
    notes?: string;
  };
  counterparty: Counterparty | null;
  lines: OrderLine[];
  userRole: 'buyer' | 'seller' | null;
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

type DetailTab = 'Order History' | 'Seller Details' | 'Buyer Details' | 'Order Description';

const deliveryStatusForUpdate = (delivery: string): ShippingUpdateData['deliveryStatus'] => {
  if (delivery === 'Complete' || delivery === 'Completed' || delivery === 'Delivered') {
    return 'Completed';
  }
  if (delivery === 'Cancel' || delivery === 'Cancelled') return 'Cancelled';
  if (delivery === 'In transit' || delivery === 'In Progress') return 'In Progress';
  return 'Not Initiated';
};

const hasCompletedStage = (order: Pick<OrderDetail, 'processingStages'>) =>
  (order.processingStages || []).some(
    (stage) => stage.stage === 'order_completed' && stage.status === 'completed'
  );

const hasShippingUpdate = (order: OrderDetail) =>
  Boolean(
    order.shipping?.trackingNumber ||
      order.shipping?.provider ||
      order.shipping?.estimatedDeliveryDate ||
      order.shipping?.notes ||
      order.delivery === 'Shipped' ||
      order.delivery === 'Complete'
  );

export default function OrderDetailScreen({
  order,
  backHref = '/order',
  onOrderUpdated,
}: {
  order: OrderDetail;
  backHref?: string;
  onOrderUpdated?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const { accessToken } = useUser();
  const isBuyerCtx = order.userRole === 'buyer';
  const detailsLabel: DetailTab = isBuyerCtx ? 'Seller Details' : 'Buyer Details';
  const tabs: DetailTab[] = ['Order History', detailsLabel, 'Order Description'];
  const [tab, setTab] = useState<DetailTab>('Order History');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const orderCompleted = hasCompletedStage(order);
  const canConfirmOrder = order.delivery === 'Delivered' && !orderCompleted;
  const initialShippingData = useMemo(
    () => ({
      deliveryStatus: deliveryStatusForUpdate(order.delivery),
      trackingNumber: order.shipping?.trackingNumber || '',
      shippingProvider: order.shipping?.provider || '',
      estimatedDeliveryDate: order.shipping?.estimatedDeliveryDate || '',
      additionalNotes: order.shipping?.notes || '',
    }),
    [order.delivery, order.shipping]
  );
  const {
    isUpdateModalOpen,
    isUpdating,
    updateError,
    updateSuccess,
    shippingData,
    setIsUpdateModalOpen,
    setShippingData,
    handleShippingUpdate,
    resetUpdateState,
  } = useShippingUpdate(initialShippingData);

  const handleUpdateShipping = useCallback(() => {
    setIsUpdateModalOpen(true);
  }, [setIsUpdateModalOpen]);

  const handleUpdateModalClose = useCallback(() => {
    setIsUpdateModalOpen(false);
    resetUpdateState();
  }, [resetUpdateState, setIsUpdateModalOpen]);

  const handleShippingUpdateSubmit = useCallback(() => {
    handleShippingUpdate(order.orderId, onOrderUpdated);
  }, [handleShippingUpdate, onOrderUpdated, order.orderId]);

  const handleConfirmOrderClick = useCallback(() => {
    if (!canConfirmOrder || isConfirming) return;
    setActionError(null);
    setIsConfirmModalOpen(true);
  }, [canConfirmOrder, isConfirming]);

  const handleConfirmModalClose = useCallback(() => {
    if (isConfirming) return;
    setIsConfirmModalOpen(false);
  }, [isConfirming]);

  const handleConfirmOrder = useCallback(async () => {
    if (!accessToken || isConfirming || hasCompletedStage(order)) return;

    setIsConfirming(true);
    setActionError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) throw new Error('API base URL is not defined.');

      const response = await fetch(
        `${API_URL}/api/v5/orders/${order.orderId}/confirm-receipt`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rating: 5, feedback: '' }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to confirm order.');
      }
      setIsConfirmModalOpen(false);
      await onOrderUpdated?.();
    } catch (error: any) {
      setActionError(error.message || 'Failed to confirm order.');
    } finally {
      setIsConfirming(false);
    }
  }, [accessToken, isConfirming, onOrderUpdated, order]);

  const lineSubtotal = useMemo(
    () => order.lines.reduce((acc, l) => acc + l.price * l.quantity, 0),
    [order.lines]
  );
  const total = order.financial?.totalCost ?? lineSubtotal;
  const showActions = isBuyerCtx ? !orderCompleted : !hasShippingUpdate(order);

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
            key={`${line.templateId}-${i}`}
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

        {showActions && (
          <div
            style={{
              padding: '20px 24px',
              borderTop: `1px solid ${hair2}`,
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            {isBuyerCtx ? (
              <>
                <button
                  type="button"
                  onClick={handleConfirmOrderClick}
                  disabled={!canConfirmOrder || isConfirming}
                  style={{
                    ...ghostBtn,
                    padding: '12px 32px',
                    borderRadius: 12,
                    opacity: !canConfirmOrder || isConfirming ? 0.55 : 1,
                    cursor: !canConfirmOrder || isConfirming ? 'not-allowed' : 'pointer',
                  }}
                >
                  {orderCompleted ? 'Completed' : isConfirming ? 'Confirming...' : 'Confirm Order'}
                </button>
                <button
                  type="button"
                  style={{ ...primaryBtn, padding: '12px 32px', borderRadius: 12 }}
                >
                  Dispute
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleUpdateShipping}
                style={{ ...ghostBtn, padding: '12px 38px', borderRadius: 12 }}
              >
                Update Shipping
              </button>
            )}
            {actionError && (
              <div style={{ fontSize: 12, color: '#b91c1c', alignSelf: 'center' }}>
                {actionError}
              </div>
            )}
          </div>
        )}
      </Card>

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
        {(tab === 'Seller Details' || tab === 'Buyer Details') && (
          <CounterpartyDetails
            counterparty={order.counterparty}
            roleLabel={isBuyerCtx ? 'Seller' : 'Buyer'}
          />
        )}
        {tab === 'Order Description' && <OrderDescription order={order} />}
      </div>

      <ShippingUpdateModal
        isOpen={isUpdateModalOpen}
        isUpdating={isUpdating}
        updateError={updateError}
        updateSuccess={updateSuccess}
        shippingData={shippingData}
        onClose={handleUpdateModalClose}
        onUpdate={handleShippingUpdateSubmit}
        onShippingDataChange={setShippingData}
      />

      {isConfirmModalOpen && (
        <ConfirmReceiptModal
          orderId={order.orderId}
          isConfirming={isConfirming}
          error={actionError}
          onClose={handleConfirmModalClose}
          onConfirm={handleConfirmOrder}
        />
      )}
    </ScreenShell>
  );
}

function ConfirmReceiptModal({
  orderId,
  isConfirming,
  error,
  onClose,
  onConfirm,
}: {
  orderId: string;
  isConfirming: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(10,10,12,0.38)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-receipt-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          borderRadius: 12,
          background: '#fff',
          boxShadow: '0 18px 60px rgba(10,10,12,0.22)',
          border: `1px solid ${hair}`,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '22px 24px 16px', borderBottom: `1px solid ${hair2}` }}>
          <div
            id="confirm-receipt-title"
            style={{ fontSize: 18, fontWeight: 650, color: ink, letterSpacing: -0.2 }}
          >
            Confirm Order Receipt
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: muted, lineHeight: 1.55 }}>
            Confirm that you received order #{orderId} in satisfactory condition.
            This will mark the order as completed.
          </div>
        </div>
        <div
          style={{
            padding: '18px 24px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {error && (
            <div
              style={{
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#b91c1c',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isConfirming}
              style={{
                ...ghostBtn,
                borderRadius: 10,
                padding: '10px 18px',
                opacity: isConfirming ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              style={{
                ...primaryBtn,
                borderRadius: 10,
                padding: '10px 18px',
                opacity: isConfirming ? 0.7 : 1,
                cursor: isConfirming ? 'not-allowed' : 'pointer',
              }}
            >
              {isConfirming ? 'Confirming...' : 'Confirm Receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  Shipped: '#3730a3',
  'In Review': '#b45309',
  'In Transit': '#b45309',
  'Awaiting Confirmation': '#b45309',
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
  const isCompleted = hasCompletedStage(order);
  const isDelivered = order.delivery === 'Delivered' || order.delivery === 'Complete';
  const isShipped = isDelivered || order.delivery === 'Shipped';
  const events = isBuyer
    ? [
        {
          label: 'Payment Status',
          status: order.payment === 'completed' ? 'Completed' : 'Pending',
          when: formatTime(order.orderDate),
          done: order.payment === 'completed',
        },
        {
          label: 'Tracking Status',
          status: isDelivered ? 'Arrived' : 'In Transit',
          when: formatTime(order.orderDate),
          done: isDelivered,
        },
        {
          label: 'Order Status',
          status: isCompleted
            ? 'Completed'
            : isDelivered
              ? 'Awaiting Confirmation'
              : order.delivery,
          when: formatDate(order.orderDate),
          done: isCompleted,
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
          status: isShipped ? 'Shipped' : 'In Transit',
          when: formatTime(order.orderDate),
          done: isShipped,
          sub: `Expected delivery: ${formatDate(order.orderDate)}`,
        },
        {
          label: 'Order Status',
          status: isCompleted ? 'Completed' : order.delivery,
          when:
            isCompleted ? formatDate(order.orderDate) : 'TBD',
          done: isCompleted,
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
  roleLabel,
}: {
  counterparty: Counterparty | null;
  roleLabel: 'Buyer' | 'Seller';
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
            {roleLabel} · order counterparty
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {/* <button type="button" style={ghostBtn}>
          Send message
        </button> */}
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
        Description and metadata sourced from the seller&apos;s product page; check
        the NFT template for the full spec.
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
