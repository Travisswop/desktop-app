'use client';

import { useCallback, useEffect, useState, use } from 'react';
import { useUser } from '@/lib/UserContext';
import OrderDetailScreen, {
  type OrderDetail,
} from '@/components/order/OrderDetailScreen';
import { Skeleton } from '@/components/ui/skeleton';
import { createOrderDispute } from '@/actions/disputeActions';
import {
  confirmMarketplaceReceipt,
  deliveryFullyConfirmed,
  downloadMarketplaceDigitalAsset,
  getMarketplaceOrder,
  getMarketplaceReceipt,
  orderRequiresShippingFlow,
  updateMarketplaceShipping,
  type MarketplaceDigitalAsset,
  type MarketplaceOrder,
  type MarketplaceParty,
  type MarketplaceReceiptState,
} from '@/lib/marketplace-api';

interface Props {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: Props) {
  const { id } = use(params);
  const { user, accessToken } = useUser();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    async (orderId: string, token: string, currentUserId: string) => {
      const [marketplaceOrder, receiptPayload] = await Promise.all([
        getMarketplaceOrder(token, orderId),
        getMarketplaceReceipt(token, orderId).catch(() => null),
      ]);
      const receipt = receiptPayload?.receipt
        ? mergeReceiptState(
            receiptPayload.order?.receipt || marketplaceOrder.receipt,
            receiptPayload.receipt
          )
        : marketplaceOrder.receipt;
      return mapMarketplaceOrderDetail(
        receiptPayload?.order || marketplaceOrder,
        currentUserId,
        receipt
      );
    },
    []
  );

  const replaceOrder = useCallback(
    (nextOrder: MarketplaceOrder, receipt?: MarketplaceReceiptState) => {
      if (!user?._id) return;
      setOrder(mapMarketplaceOrderDetail(nextOrder, user._id, receipt));
    },
    [user?._id]
  );

  useEffect(() => {
    let cancelled = false;
    if (!user?._id || !accessToken) {
      const t = setTimeout(() => {
        if (!cancelled && !accessToken) {
          setError('Authentication required.');
          setLoading(false);
        }
      }, 5000);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    setLoading(true);
    setError(null);
    setActionError(null);
    load(id, accessToken, user._id)
      .then((data) => {
        if (!cancelled) {
          setOrder(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setError('Failed to load order.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, user, accessToken, load]);

  const handleUpdateShipping = useCallback(
    async (payload: {
      status: string;
      trackingNumber?: string;
      carrier?: string;
      estimatedDeliveryDate?: string;
      note?: string;
    }) => {
      if (!accessToken || !order) return;
      setActionLoading(true);
      setActionError(null);
      try {
        const updated = await updateMarketplaceShipping(
          accessToken,
          order._id || order.orderId,
          payload
        );
        replaceOrder(updated, updated.receipt);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update shipping.';
        setActionError(message);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [accessToken, order, replaceOrder]
  );

  const handleConfirmReceipt = useCallback(
    async (payload: { rating?: number; feedback?: string }) => {
      if (!accessToken || !order) return;
      setActionLoading(true);
      setActionError(null);
      try {
        const updated = await confirmMarketplaceReceipt(
          accessToken,
          order._id || order.orderId,
          payload
        );
        replaceOrder(updated, updated.receipt);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to confirm order received.';
        setActionError(message);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [accessToken, order, replaceOrder]
  );

  const handleDispute = useCallback(
    async (payload: { reason: string }) => {
      if (!accessToken || !order || !user?._id) return;
      setActionLoading(true);
      setActionError(null);
      try {
        const result = await createOrderDispute(
          order._id || order.orderId,
          {
            reason: payload.reason,
            category: 'other',
            description: payload.reason,
            priority: 'medium',
          },
          accessToken
        );
        if (!result?.success) {
          throw new Error(result?.message || 'Failed to open dispute.');
        }
        // Re-fetch so the order reflects its new disputed state.
        const refreshed = await load(
          order._id || order.orderId,
          accessToken,
          user._id
        );
        setOrder(refreshed);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to open dispute.';
        setActionError(message);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [accessToken, order, user?._id, load]
  );

  const handleDownloadDigitalAsset = useCallback(
    async (line: { productId: string | null; digitalAsset?: MarketplaceDigitalAsset | null }) => {
      if (!accessToken || !order || !line.productId) return;
      setActionLoading(true);
      setActionError(null);
      try {
        const result = await downloadMarketplaceDigitalAsset(
          accessToken,
          order._id || order.orderId,
          line.productId
        );
        const url = URL.createObjectURL(result.blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download =
          result.fileName ||
          line.digitalAsset?.fileName ||
          line.digitalAsset?.originalName ||
          'swop-digital-download';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to download item.';
        setActionError(message);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [accessToken, order]
  );

  return (
    <main className="main-container">
      <div
        style={{
          background: '#f4f4f2',
          minHeight: '100vh',
          padding: '28px 24px',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {loading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="text-center py-16 text-red-600">{error}</div>
          ) : order ? (
            <OrderDetailScreen
              order={order}
              backHref="/order"
              actionLoading={actionLoading}
              actionError={actionError}
              onUpdateShipping={handleUpdateShipping}
              onConfirmReceipt={handleConfirmReceipt}
              onDispute={handleDispute}
              onDownloadDigitalAsset={handleDownloadDigitalAsset}
            />
          ) : (
            <div className="text-center py-16 text-gray-500">
              Order not found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function mapMarketplaceOrderDetail(
  order: MarketplaceOrder,
  currentUserId: string,
  receipt?: MarketplaceReceiptState
): OrderDetail {
  const role =
    String(order.buyer?.id || '') === String(currentUserId) ? 'buyer' : 'seller';
  const counterparty = role === 'buyer' ? order.merchant : order.buyer;

  return {
    orderId: order.publicReference || order.orderId || order._id,
    _id: order._id || order.orderId,
    orderDate: order.createdAt || order.updatedAt || '',
    delivery: deliveryLabel(order, role),
    payment: order.payment?.status || 'pending',
    chain:
      String(order.financial?.currency || order.payment?.currency || 'USDC')
        .toUpperCase() === 'SOL'
        ? 'SOL'
        : 'USDC',
    financial: order.financial,
    counterparty: mapCounterparty(counterparty),
    lines: (order.lineItems || []).map((item) => ({
      productId: item.productId || null,
      name: item.productSnapshot?.title || 'Marketplace item',
      image: item.productSnapshot?.image || null,
      price: Number(item.unitAmount) || 0,
      quantity: Number(item.quantity) || 1,
      digitalAsset: item.productSnapshot?.digitalAsset || null,
    })),
    userRole: role,
    status: order.status,
    orderType: order.orderType,
    checkoutMode: order.checkoutMode,
    settlement: order.settlement,
    receipt: receipt || order.receipt,
    fulfillment: order.fulfillment,
    processingStages: (order.fulfillment?.events || []).map((event) => ({
      stage: event.stage,
      timestamp: event.timestamp || order.createdAt || '',
      status: event.status || 'completed',
    })),
  };
}

function mapCounterparty(party?: MarketplaceParty | null) {
  if (!party) return null;
  return {
    id: party.id || null,
    name: partyName(party),
    email: party.email || '',
    wallet: party.wallet || null,
    avatar: initials(party),
  };
}

function deliveryLabel(order: MarketplaceOrder, role: 'buyer' | 'seller') {
  if (
    order.payment?.status === 'cancelled' ||
    order.status === 'cancelled' ||
    order.status === 'failed' ||
    order.settlement?.status === 'failed'
  ) {
    return 'Cancel';
  }
  if (order.payment?.status === 'refunded') return 'Refunded';

  // Digital / no-shipping orders complete as soon as payment clears.
  if (!orderRequiresShippingFlow(order)) {
    return order.payment?.status === 'completed'
      ? role === 'buyer'
        ? 'Delivered'
        : 'Complete'
      : 'Pending';
  }

  // Shippable orders are only complete once BOTH the seller confirms delivery
  // and the buyer confirms receipt. Until then they stay pending, regardless of
  // settlement release or auto-completion.
  if (deliveryFullyConfirmed(order)) {
    return role === 'buyer' ? 'Delivered' : 'Complete';
  }

  if (
    order.fulfillment?.status === 'shipped' ||
    order.fulfillment?.status === 'out_for_delivery'
  ) {
    return 'In transit';
  }

  return 'Pending';
}

function partyName(party?: MarketplaceParty | null) {
  return (
    party?.name ||
    party?.email ||
    shortWallet(party?.wallet?.address) ||
    'Unknown'
  );
}

function initials(party?: MarketplaceParty | null) {
  const name = partyName(party);
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  );
}

function shortWallet(address?: string) {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function mergeReceiptState(
  fallback: MarketplaceReceiptState | undefined,
  receipt: unknown
): MarketplaceReceiptState {
  if (!receipt || typeof receipt !== 'object') return fallback || {};
  const data = receipt as Record<string, unknown>;
  return {
    receiptId: String(data._id || data.receiptId || fallback?.receiptId || ''),
    status:
      (data.status as MarketplaceReceiptState['status']) ||
      fallback?.status ||
      'pending',
    mintAddress: String(data.mintAddress || fallback?.mintAddress || '') || null,
    provider: String(data.provider || fallback?.provider || '') || null,
    txHash: String(data.txHash || fallback?.txHash || '') || null,
    metadataUri: String(data.metadataUri || fallback?.metadataUri || '') || null,
    error: String(data.error || fallback?.error || '') || null,
    mintedAt: String(data.mintedAt || fallback?.mintedAt || '') || null,
  };
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-5 w-96" />
    <div className="grid grid-cols-[220px_1fr] gap-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <Skeleton className="h-64 rounded-2xl" />
    <Skeleton className="h-40 rounded-2xl" />
  </div>
);
