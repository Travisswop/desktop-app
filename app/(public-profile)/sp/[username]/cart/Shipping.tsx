'use client';
import { prepareTransaction, submitTransaction } from '@/actions/orderActions';
import { truncateWalletAddress } from '@/lib/tranacateWalletAddress';
import { useUser } from '@/lib/UserContext';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { useCart } from './context/CartContext';
import { CartItem } from './components/types';

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

// Add the helper function to clear cart from localStorage
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

  // Privy v3 Solana wallet hooks
  const { ready: solanaReady, wallets: directSolanaWallets } =
    useSolanaWallets();

  // Find the first Solana wallet with a valid address
  const selectedSolanaWallet = useMemo(() => {
    if (!solanaReady || !directSolanaWallets.length) return undefined;
    // Find the first wallet with a valid address
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
  const firstItemName = cartItems[0]?.nftTemplate?.name || 'Order';
  const productLabel =
    cartItems.length > 1 ? `${firstItemName} +${cartItems.length - 1}` : firstItemName;
  const tokenAmount = formatTokenAmount(amountOfToken);

  const params = useParams();
  const router = useRouter();

  // Handle username potentially being string or string[]
  let username: string | undefined;
  const usernameParam = params?.username;
  if (Array.isArray(usernameParam)) {
    username = usernameParam[0]; // Take the first element if it's an array
  } else {
    username = usernameParam;
  }

  // Loading state derived from transaction stage
  const isLoading =
    transactionStage !== TRANSACTION_STAGES.IDLE &&
    transactionStage !== TRANSACTION_STAGES.COMPLETED &&
    transactionStage !== TRANSACTION_STAGES.FAILED;

  // Auto-redirect after successful transaction
  useEffect(() => {
    let redirectTimer: string | number | NodeJS.Timeout | undefined;
    if (transactionStage === TRANSACTION_STAGES.COMPLETED) {
      // Clear the cart when transaction is completed
      dispatch({ type: 'CLEAR_CART' });
      if (username) {
        // Check if username is defined (now it should be string | undefined)
        clearCartFromLocalStorage(username);
      }

      redirectTimer = setTimeout(() => {
        const query = new URLSearchParams();
        if (orderId) query.set('orderId', orderId);
        if (username) {
          // Check if username is defined before adding to URL
          query.set('username', username);
        }
        router.push(`/payment-success?${query.toString()}`);
      }, 3000); // Give user time to see success message
    }
    return () => clearTimeout(redirectTimer);
  }, [transactionStage, router, username, orderId, dispatch]); // Ensure username is in dependency array

  const getStageMessage = () => {
    switch (transactionStage) {
      case TRANSACTION_STAGES.INITIATING:
        return 'Preparing transaction...';
      case TRANSACTION_STAGES.PROCESSING:
        return 'Building transaction...';
      case TRANSACTION_STAGES.SIGNING:
        return 'Waiting for wallet signature...';
      case TRANSACTION_STAGES.CONFIRMING:
        return 'Confirming transaction on blockchain...';
      case TRANSACTION_STAGES.COMPLETED:
        return 'Transaction completed successfully!';
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
      // INITIATING: validate prerequisites
      if (!selectedSolanaWallet) {
        throw new Error('Solana wallet not found. Please connect your wallet.');
      }

      if (!selectedSolanaWallet.address) {
        throw new Error('Solana wallet address is not available. Please refresh and try again.');
      }

      if (!orderId) {
        throw new Error('Order not created. Please go back and try again.');
      }

      if (!accessToken) {
        throw new Error('Authentication required. Please log in and try again.');
      }

      if (Number(tokenAmount) <= 0) {
        throw new Error('Token amount is unavailable. Please choose another asset.');
      }

      // PROCESSING: backend builds the transaction
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

      // SIGNING: frontend signs only (no broadcast)
      setTransactionStage(TRANSACTION_STAGES.SIGNING);
      const signResult = await selectedSolanaWallet.signTransaction({
        transaction: base64ToUint8Array(serializedTransaction),
      });

      // CONFIRMING: backend broadcasts, confirms, validates, and completes order
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

  const renderTransactionStatus = () => {
    if (transactionStage === TRANSACTION_STAGES.IDLE) return null;

    return (
      <div
        className={`mt-4 p-4 rounded-xl flex items-start gap-3 text-start ${
          transactionStage === TRANSACTION_STAGES.COMPLETED
            ? 'bg-green-50 border border-green-100'
            : transactionStage === TRANSACTION_STAGES.FAILED
            ? 'bg-red-50 border border-red-100'
            : 'bg-blue-50 border border-blue-100'
        }`}
      >
        {transactionStage === TRANSACTION_STAGES.COMPLETED ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        ) : transactionStage === TRANSACTION_STAGES.FAILED ? (
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        ) : (
          <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
        )}
        <div
          className={`text-sm ${
            transactionStage === TRANSACTION_STAGES.COMPLETED
              ? 'text-green-700'
              : transactionStage === TRANSACTION_STAGES.FAILED
              ? 'text-red-700'
              : 'text-blue-700'
          }`}
        >
          <p className="font-medium">{getStageMessage()}</p>
          {transactionHash && (
            <p className="mt-1 text-xs">
              Transaction hash:{' '}
              {truncateWalletAddress(transactionHash)}
              <a
                href={`https://solscan.io/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-blue-600 hover:underline inline-flex items-center"
              >
                View <ArrowRight className="w-3 h-3 ml-0.5" />
              </a>
            </p>
          )}
          {transactionStage === TRANSACTION_STAGES.COMPLETED && (
            <p className="mt-1 text-xs animate-pulse">
              Redirecting you shortly...
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col px-5 pb-5">
      <div className="flex items-center justify-between pb-4 pt-1">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src={'/astro-agent.png'}
            alt="astro"
            width={120}
            height={90}
            className="h-auto w-11 shrink-0"
          />
          <div className="flex min-w-0 flex-col items-start">
            <p className="text-base font-semibold leading-5 text-gray-950">
              Review
            </p>
            <p className="truncate text-sm font-medium text-gray-500">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} from{' '}
              <span className="text-sky-600">
                {username || 'this store'}
              </span>
            </p>
          </div>
        </div>
        <h4 className="shrink-0 text-base font-bold text-gray-700">
          {selectedToken?.symbol || 'SOL'}
        </h4>
      </div>

      <div className="-mx-5 flex flex-col items-start bg-gray-200 px-5 py-4">
        <p className="text-sm font-semibold text-gray-500">
          Asset Change (estimate)
        </p>
        <p className="mt-1 text-base font-bold text-gray-950">
          - <span className="text-red-500">{tokenAmount} </span>
          {selectedToken?.symbol || 'SOL'}
        </p>
      </div>

      <div className="space-y-3 py-4">
        {[
          ['Product', productLabel],
          [
            'Wallet Used',
            selectedSolanaWallet?.address
              ? truncateWalletAddress(selectedSolanaWallet.address)
              : 'Not selected',
          ],
          ['Network', formatNetwork(selectedToken?.chain)],
          ['Network Fee', 'Estimated at signing'],
          ['Subtotal', formatCurrency(subtotal)],
          ['Shipping Cost', formatCurrency(shippingCost)],
          ['Total Cost', formatCurrency(totalCost)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 text-[15px]"
          >
            <p className="shrink-0 font-semibold text-gray-950">{label}</p>
            <p className="min-w-0 truncate text-right font-semibold text-gray-500">
              {value}
            </p>
          </div>
        ))}
      </div>

      {renderTransactionStatus()}

      {!isLoading &&
        transactionStage !== TRANSACTION_STAGES.COMPLETED && (
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-yellow-50 px-4 py-4 text-start">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="text-sm font-medium leading-5 text-amber-700">
              Transactions cannot be reversed after confirmation.
              Please ensure all details are correct.
            </div>
          </div>
        )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSelectedToken(null)}
          disabled={isLoading}
          className="h-10 rounded-xl border-2 border-slate-300 bg-white text-sm font-bold text-gray-600 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSendConfirm}
          disabled={
            isLoading ||
            transactionStage === TRANSACTION_STAGES.COMPLETED
          }
          className="flex h-10 items-center justify-center rounded-xl bg-black text-sm font-bold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </span>
          ) : transactionStage === TRANSACTION_STAGES.COMPLETED ? (
            'Completed!'
          ) : (
            'Confirm'
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentShipping;
