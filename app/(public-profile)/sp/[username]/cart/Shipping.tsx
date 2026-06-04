'use client';
import { prepareTransaction, submitTransaction } from '@/actions/orderActions';
import { truncateWalletAddress } from '@/lib/tranacateWalletAddress';
import { useUser } from '@/lib/UserContext';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { useCart } from './context/CartContext';
import { CartItem } from './components/types';
import { clearUserCart } from '@/actions/addToCartActions';

const TRANSACTION_STAGES = {
  IDLE: 'idle',
  INITIATING: 'initiating',
  PROCESSING: 'processing',
  SIGNING: 'signing',
  CONFIRMING: 'confirming',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

type PaymentShippingProps = {
  selectedToken: any;
  setSelectedToken: (token: any) => void;
  subtotal: number;
  shippingCost: number;
  totalCost: number;
  amountOfToken: string | null;
  walletData: any;
  customerInfo: any;
  cartItems: CartItem[];
  orderId?: string | null;
};

const ink = '#0a0a0c';
const muted = '#6e6e76';
const muted2 = '#a1a1a8';
const hair = 'rgba(0,0,0,0.06)';
const hair2 = 'rgba(0,0,0,0.04)';
const posGreen = '#19a974';
const posGreenSoft = 'rgba(25,169,116,0.1)';
const negRed = '#e5484d';
const negRedSoft = 'rgba(229,72,77,0.08)';
const cardShadow =
  '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)';
const mono = 'var(--font-jetbrains-mono), ui-monospace, monospace';

const formatCurrency = (value: number) =>
  `${Number(value || 0).toFixed(2)} USDC`;

const formatNetwork = (chain?: string) =>
  chain ? chain.replace(/_/g, ' ').toUpperCase() : 'SOLANA';

const formatTokenAmount = (amount: string | number | null | undefined) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return '0';
  }
  return numericAmount.toFixed(4);
};

const base64ToUint8Array = (value: string) => {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const uint8ArrayToBase64 = (value: Uint8Array) => {
  let binary = '';
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

const clearCartFromLocalStorage = (username: string) => {
  if (typeof window !== 'undefined' && username) {
    const storageKey = `marketplace-cart-${username}`;
    localStorage.removeItem(storageKey);
  }
};

const PaymentShipping: React.FC<PaymentShippingProps> = ({
  selectedToken,
  setSelectedToken,
  subtotal,
  shippingCost,
  totalCost,
  amountOfToken,
  cartItems,
  orderId: existingOrderId,
}) => {
  const { accessToken } = useUser();
  const { dispatch } = useCart();
  const [transactionStage, setTransactionStage] = useState(
    TRANSACTION_STAGES.IDLE
  );
  const [orderId] = useState(existingOrderId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState('');

  const { ready: solanaReady, wallets: directSolanaWallets } =
    useSolanaWallets();

  const selectedSolanaWallet = useMemo(() => {
    if (!solanaReady || !directSolanaWallets.length) return undefined;
    const walletWithAddress = directSolanaWallets.find(
      (w) => w.address && w.address.length > 0
    );
    return walletWithAddress || directSolanaWallets[0];
  }, [solanaReady, directSolanaWallets]);

  const itemCount = useMemo(
    () =>
      cartItems.reduce((total, item) => total + (item.quantity || 0), 0),
    [cartItems]
  );
  const sellerId = cartItems[0]?.sellerId;
  const firstItemName = cartItems[0]?.nftTemplate?.name || 'Order';
  const productLabel =
    cartItems.length > 1
      ? `${firstItemName} +${cartItems.length - 1}`
      : firstItemName;
  const tokenAmount = formatTokenAmount(amountOfToken);

  const params = useParams();
  const router = useRouter();

  let username: string | undefined;
  const usernameParam = params?.username;
  if (Array.isArray(usernameParam)) {
    username = usernameParam[0];
  } else {
    username = usernameParam;
  }

  const isLoading =
    transactionStage !== TRANSACTION_STAGES.IDLE &&
    transactionStage !== TRANSACTION_STAGES.COMPLETED &&
    transactionStage !== TRANSACTION_STAGES.FAILED;

  useEffect(() => {
    let redirectTimer: string | number | NodeJS.Timeout | undefined;
    if (transactionStage === TRANSACTION_STAGES.COMPLETED) {
      dispatch({ type: 'CLEAR_CART' });
      if (username) {
        clearCartFromLocalStorage(username);
      }

      if (accessToken && username) {
        clearUserCart(accessToken, username, sellerId).catch((err) => {
          console.error('Failed to clear server cart:', err);
        });
      }

      redirectTimer = setTimeout(() => {
        const query = new URLSearchParams();
        if (orderId) query.set('orderId', orderId);
        if (username) {
          query.set('username', username);
        }
        router.push(`/payment-success?${query.toString()}`);
      }, 3000);
    }
    return () => clearTimeout(redirectTimer);
  }, [
    transactionStage,
    router,
    username,
    orderId,
    dispatch,
    accessToken,
    sellerId,
  ]);

  const getStageMessage = () => {
    switch (transactionStage) {
      case TRANSACTION_STAGES.INITIATING:
        return 'Preparing transaction…';
      case TRANSACTION_STAGES.PROCESSING:
        return 'Building transaction…';
      case TRANSACTION_STAGES.SIGNING:
        return 'Waiting for wallet signature…';
      case TRANSACTION_STAGES.CONFIRMING:
        return 'Confirming on Solana…';
      case TRANSACTION_STAGES.COMPLETED:
        return 'Transaction completed';
      case TRANSACTION_STAGES.FAILED:
        return error || 'Transaction failed. Please try again.';
      default:
        return '';
    }
  };

  const handleSendConfirm = async () => {
    setError(null);
    setTransactionHash('');
    setTransactionStage(TRANSACTION_STAGES.INITIATING);

    try {
      if (!selectedSolanaWallet) {
        throw new Error('Solana wallet not found. Please connect your wallet.');
      }
      if (!selectedSolanaWallet.address) {
        throw new Error(
          'Solana wallet address is not available. Please refresh and try again.'
        );
      }
      if (!orderId) {
        throw new Error('Order not created. Please go back and try again.');
      }
      if (!accessToken) {
        throw new Error(
          'Authentication required. Please log in and try again.'
        );
      }
      if (Number(tokenAmount) <= 0) {
        throw new Error(
          'Token amount is unavailable. Please choose another asset.'
        );
      }

      setTransactionStage(TRANSACTION_STAGES.PROCESSING);
      const { serializedTransaction } = await prepareTransaction(
        orderId,
        {
          fromAddress: selectedSolanaWallet.address,
          tokenMint: selectedToken?.address || null,
          tokenDecimals: selectedToken?.decimals ?? 9,
          tokenAmount,
        },
        accessToken
      );

      setTransactionStage(TRANSACTION_STAGES.SIGNING);
      const signResult = await selectedSolanaWallet.signTransaction({
        transaction: base64ToUint8Array(serializedTransaction),
      });

      setTransactionStage(TRANSACTION_STAGES.CONFIRMING);
      const result = await submitTransaction(
        orderId,
        {
          signedTransaction: uint8ArrayToBase64(
            signResult.signedTransaction
          ),
        },
        accessToken
      );

      if (!result.success) {
        throw new Error(result.error || 'Transaction submission failed');
      }

      setTransactionHash(result.transactionHash || '');
      setTransactionStage(TRANSACTION_STAGES.COMPLETED);
    } catch (err) {
      console.error('Error processing transaction:', err);
      setTransactionStage(TRANSACTION_STAGES.FAILED);
      setError(
        err instanceof Error ? err.message : 'Failed to process transaction'
      );
    }
  };

  const tokenSymbol = selectedToken?.symbol || 'SOL';
  const stageDone = transactionStage === TRANSACTION_STAGES.COMPLETED;
  const stageFailed = transactionStage === TRANSACTION_STAGES.FAILED;

  const stageOrder = [
    TRANSACTION_STAGES.INITIATING,
    TRANSACTION_STAGES.PROCESSING,
    TRANSACTION_STAGES.SIGNING,
    TRANSACTION_STAGES.CONFIRMING,
    TRANSACTION_STAGES.COMPLETED,
  ];
  const stageIndex = stageOrder.indexOf(transactionStage);
  const stageProgress =
    transactionStage === TRANSACTION_STAGES.IDLE
      ? 0
      : ((stageIndex + 1) / stageOrder.length) * 100;

  const summary = [
    { label: 'Product', value: productLabel, mono: false },
    {
      label: 'Wallet',
      value: selectedSolanaWallet?.address
        ? truncateWalletAddress(selectedSolanaWallet.address)
        : 'Not selected',
      mono: true,
    },
    {
      label: 'Network',
      value: formatNetwork(selectedToken?.chain),
      mono: false,
    },
    {
      label: 'Network fee',
      value: 'Estimated at signing',
      mono: false,
      muted: true,
    },
    { label: 'Subtotal', value: formatCurrency(subtotal), mono: true },
    { label: 'Shipping', value: formatCurrency(shippingCost), mono: true },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 18,
        fontFamily:
          'var(--font-inter), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        color: ink,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Image
          src="/astro-agent.png"
          alt="astro"
          width={48}
          height={48}
          style={{
            width: 44,
            height: 44,
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: muted,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              fontFamily: mono,
              marginBottom: 2,
            }}
          >
            Review &amp; confirm
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: -0.3,
              color: ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
            {username && (
              <>
                {' '}
                from{' '}
                <span style={{ color: muted, fontWeight: 500 }}>@{username}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charge callout */}
      <div
        style={{
          background: '#fff',
          border: `1px solid ${hair}`,
          borderRadius: 18,
          boxShadow: cardShadow,
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: muted,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              fontFamily: mono,
              marginBottom: 6,
            }}
          >
            You&apos;ll send
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: -0.8,
              color: ink,
              fontFamily: mono,
              lineHeight: 1,
            }}
          >
            {tokenAmount}{' '}
            <span style={{ fontSize: 13, color: muted2, fontWeight: 500 }}>
              {tokenSymbol}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: muted,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              fontFamily: mono,
              marginBottom: 6,
            }}
          >
            Total
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              fontFamily: mono,
              color: ink,
            }}
          >
            {formatCurrency(totalCost)}
          </div>
        </div>
      </div>

      {/* Order summary */}
      <div
        style={{
          background: '#fff',
          border: `1px solid ${hair}`,
          borderRadius: 18,
          boxShadow: cardShadow,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 18px',
            borderBottom: `1px solid ${hair2}`,
            fontSize: 11,
            fontWeight: 700,
            color: muted,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            fontFamily: mono,
          }}
        >
          Order summary
        </div>
        <div>
          {summary.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '11px 18px',
                borderBottom:
                  i < summary.length - 1 ? `1px solid ${hair2}` : 'none',
                fontSize: 13,
              }}
            >
              <span style={{ color: muted, fontWeight: 500 }}>
                {row.label}
              </span>
              <span
                style={{
                  color: row.muted ? muted2 : ink,
                  fontWeight: 600,
                  fontFamily: row.mono ? mono : 'inherit',
                  textAlign: 'right',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: '#fafafa',
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: ink,
              }}
            >
              Total
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                fontFamily: mono,
                color: ink,
                letterSpacing: -0.3,
              }}
            >
              {formatCurrency(totalCost)}
            </span>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {transactionStage !== TRANSACTION_STAGES.IDLE && (
        <div
          style={{
            background: stageDone
              ? posGreenSoft
              : stageFailed
              ? negRedSoft
              : '#fff7e6',
            border: `1px solid ${
              stageDone
                ? 'rgba(25,169,116,0.22)'
                : stageFailed
                ? 'rgba(229,72,77,0.22)'
                : 'rgba(217,119,6,0.22)'
            }`,
            borderRadius: 14,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
          >
            {stageDone ? (
              <CheckCircle2
                size={18}
                color={posGreen}
                style={{ marginTop: 1, flexShrink: 0 }}
              />
            ) : stageFailed ? (
              <AlertCircle
                size={18}
                color={negRed}
                style={{ marginTop: 1, flexShrink: 0 }}
              />
            ) : (
              <Loader2
                size={18}
                color="#b45309"
                style={{ marginTop: 1, flexShrink: 0 }}
                className="animate-spin"
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: stageDone
                    ? '#0d8b3e'
                    : stageFailed
                    ? '#b91c1c'
                    : '#b45309',
                }}
              >
                {getStageMessage()}
              </div>
              {transactionHash && (
                <a
                  href={`https://solscan.io/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 4,
                    fontSize: 11.5,
                    color: posGreen,
                    fontFamily: mono,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  {truncateWalletAddress(transactionHash)}
                  <ExternalLink size={11} />
                </a>
              )}
              {stageDone && (
                <div
                  className="animate-pulse"
                  style={{
                    fontSize: 11,
                    color: '#0d8b3e',
                    marginTop: 6,
                  }}
                >
                  Redirecting you shortly…
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {!stageFailed && (
            <div
              style={{
                height: 3,
                width: '100%',
                background: 'rgba(0,0,0,0.05)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${stageProgress}%`,
                  height: '100%',
                  background: stageDone ? posGreen : '#d97706',
                  transition: 'width .35s ease',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Irreversible warning */}
      {!isLoading && !stageDone && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: '#fffaf0',
            border: '1px solid rgba(217,119,6,0.18)',
            borderRadius: 14,
            padding: '12px 14px',
          }}
        >
          <ShieldCheck
            size={18}
            color="#b45309"
            style={{ marginTop: 1, flexShrink: 0 }}
          />
          <div style={{ fontSize: 12.5, color: '#925a13', lineHeight: 1.5 }}>
            Transactions on Solana are final — there&apos;s no chargeback.
            Confirm details before signing.
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginTop: 4,
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedToken(null)}
          disabled={isLoading}
          style={{
            height: 44,
            borderRadius: 12,
            background: '#fff',
            border: `1px solid ${hair}`,
            color: ink,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: -0.2,
            opacity: isLoading ? 0.55 : 1,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSendConfirm}
          disabled={isLoading || stageDone}
          style={{
            height: 44,
            borderRadius: 12,
            background: ink,
            border: 0,
            color: '#fff',
            cursor: isLoading || stageDone ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: -0.2,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: isLoading || stageDone ? 0.7 : 1,
            transition: 'opacity .15s',
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Processing…
            </>
          ) : stageDone ? (
            <>
              <CheckCircle2 size={14} />
              Completed
            </>
          ) : (
            <>
              Confirm &amp; sign
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentShipping;
