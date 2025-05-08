'use client';
import { createOrder } from '@/actions/orderActions';
import AnimateButton from '@/components/ui/Button/AnimateButton';
import { truncateWalletAddress } from '@/lib/tranacateWalletAddress';
import { useUser } from '@/lib/UserContext';
import { TransactionService } from '@/services/transaction-service';
import { useSolanaWalletContext } from '@/lib/context/SolanaWalletContext';
import { Connection } from '@solana/web3.js';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { CartItem, PaymentMethod, Status } from './components/types';
import { Network } from '@/types/wallet-types';
import { useCart } from './context/CartContext';

const TRANSACTION_STAGES = {
  IDLE: 'idle',
  INITIATING: 'initiating',
  PROCESSING: 'processing',
  CONFIRMING: 'confirming',
  CREATING_ORDER: 'creating_order',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// Add the helper function to clear cart from localStorage
const clearCartFromLocalStorage = (username: string) => {
  if (typeof window !== 'undefined' && username) {
    const storageKey = `marketplace-cart-${username}`;
    localStorage.removeItem(storageKey);
  }
};

const PaymentShipping: React.FC<{
  selectedToken: any;
  setSelectedToken: (token: any) => void;
  subtotal: number;
  amontOfToken: string;
  walletData: any;
  customerInfo: any;
  cartItems: any;
  orderId?: string | null;
}> = ({
  selectedToken,
  setSelectedToken,
  subtotal,
  amontOfToken,
  walletData,
  customerInfo,
  cartItems,
  orderId: existingOrderId,
}) => {
  const { accessToken } = useUser();
  const { dispatch } = useCart();
  const [transactionStage, setTransactionStage] = useState(
    TRANSACTION_STAGES.IDLE
  );
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState('');
  const { solanaWallets } = useSolanaWalletContext();
  const params = useParams();
  const router = useRouter();
  const name = params.username;

  // Loading state derived from transaction stage
  const isLoading =
    transactionStage !== TRANSACTION_STAGES.IDLE &&
    transactionStage !== TRANSACTION_STAGES.COMPLETED &&
    transactionStage !== TRANSACTION_STAGES.FAILED;

  // Auto-redirect after successful transaction
  useEffect(() => {
    if (existingOrderId) {
      setOrderId(existingOrderId);
    }
  }, [existingOrderId]);

  useEffect(() => {
    let redirectTimer: string | number | NodeJS.Timeout | undefined;
    if (transactionStage === TRANSACTION_STAGES.COMPLETED) {
      // Clear the cart when transaction is completed
      dispatch({ type: 'CLEAR_CART' });
      clearCartFromLocalStorage(name as string);

      redirectTimer = setTimeout(() => {
        router.push(
          `/payment-success?orderId=${orderId}&username=${name}`
        );
      }, 3000); // Give user time to see success message
    }
    return () => clearTimeout(redirectTimer);
  }, [transactionStage, router, name, orderId, dispatch]);

  const getStageMessage = () => {
    switch (transactionStage) {
      case TRANSACTION_STAGES.INITIATING:
        return 'Preparing transaction...';
      case TRANSACTION_STAGES.PROCESSING:
        return 'Processing transaction...';
      case TRANSACTION_STAGES.CONFIRMING:
        return 'Confirming transaction on blockchain...';
      case TRANSACTION_STAGES.CREATING_ORDER:
        return 'Creating your order...';
      case TRANSACTION_STAGES.COMPLETED:
        return 'Transaction completed successfully!';
      case TRANSACTION_STAGES.FAILED:
        return error || 'Transaction failed. Please try again.';
      default:
        return '';
    }
  };

  const handleSendConfirm = async () => {
    // Reset states
    setError(null);
    setTransactionHash('');
    setTransactionStage(TRANSACTION_STAGES.INITIATING);

    try {
      // Find wallet
      const solanaWallet = solanaWallets?.find(
        (w) => w.walletClientType === 'privy'
      );

      if (!solanaWallet) {
        throw new Error('Solana wallet not found');
      }

      const sendFlow = {
        token: selectedToken,
        amount: amontOfToken,
        recipient: {
          address: 'HPmEbq6VMzE8dqRuFjLrNNxmqzjvP72jCofoFap5vBR2',
        },
        isUSD: false,
        nft: null,
        network: 'SOLANA' as Network,
        step: null,
      };

      // Connection setup
      setTransactionStage(TRANSACTION_STAGES.PROCESSING);
      const connection = new Connection(
        process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL!,
        'confirmed'
      );

      // Process transaction
      const hash = await TransactionService.handleSolanaSend(
        solanaWallet,
        sendFlow,
        connection
      );

      setTransactionHash(hash);
      setTransactionStage(TRANSACTION_STAGES.CONFIRMING);

      // Wait for confirmation
      await connection.confirmTransaction(hash);

      setTransactionStage(TRANSACTION_STAGES.CREATING_ORDER);

      if (orderId && hash && accessToken) {
        try {
          const { updateOrderPayment } = await import(
            '@/actions/orderActions'
          );

          await updateOrderPayment(
            orderId,
            {
              transactionHash: hash,
              status: 'completed' as Status,
            },
            accessToken
          );

          setTransactionStage(TRANSACTION_STAGES.COMPLETED);
        } catch (updateError) {
          console.error('Error updating order payment:', updateError);
          throw new Error(
            'Failed to update order with payment details'
          );
        }
      } else if (hash && accessToken) {
        // Create a new order if we don't have an existing one (fallback)
        const orderInfo = {
          customerInfo,
          transactionHash: hash,
          paymentMethod: 'wallet' as PaymentMethod,
          status: 'completed' as Status,
        };

        const { orderId } = await createOrder(orderInfo, accessToken);
        setOrderId(orderId);
        setTransactionStage(TRANSACTION_STAGES.COMPLETED);
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
      setTransactionStage(TRANSACTION_STAGES.FAILED);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to process transaction'
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
    <div className="flex flex-col gap-2 py-4">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Image
            src={'/astro-agent.png'}
            alt="astro"
            width={120}
            height={90}
            className="w-12 h-auto"
          />
          <div className="flex flex-col items-start">
            <p className="font-medium">Review</p>
            <p className="text-gray-500 font-medium">
              Request from{' '}
              <a
                href="http://swopme.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600"
              >
                swopme.co
              </a>
            </p>
          </div>
        </div>
        <h4 className="font-semibold text-gray-700">SWOP</h4>
      </div>

      <div className="bg-gray-200 p-3 flex flex-col items-start rounded">
        <p className="text-gray-500 font-medium">
          Asset Change (estimate)
        </p>
        <p className="font-semibold">
          - <span className="text-red-500">{amontOfToken} </span>
          {selectedToken.symbol ? selectedToken.symbol : 'SOL'}
        </p>
      </div>

      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Wallet Used</p>
        <p className="text-gray-500 font-medium">
          {walletData?.[1]?.address
            ? truncateWalletAddress(walletData[1].address)
            : 'Not selected'}
        </p>
      </div>

      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Network</p>
        <p className="text-gray-500 font-medium">
          {selectedToken.chain || 'Solana'}
        </p>
      </div>

      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Network Fee</p>
        <p className="text-gray-500 font-medium">0.000005 SOL</p>
      </div>

      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Shipping Cost</p>
        <p className="text-gray-500 font-medium">$0</p>
      </div>

      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Total Cost</p>
        <p className="text-gray-500 font-medium">${subtotal}</p>
      </div>

      {/* Transaction Status Display */}
      {renderTransactionStatus()}

      {/* Warning Box (visible when not in process) */}
      {!isLoading &&
        transactionStage !== TRANSACTION_STAGES.COMPLETED && (
          <div className="bg-yellow-50 p-4 rounded-xl flex items-start gap-3 text-start mt-4">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700">
              Transactions cannot be reversed after confirmation.
              Please ensure all details are correct.
            </div>
          </div>
        )}

      {/* Action Buttons */}
      <div className="flex justify-between mt-4 gap-3">
        <AnimateButton
          whiteLoading={true}
          className="w-full"
          onClick={() => setSelectedToken('')}
          isDisabled={isLoading}
        >
          Cancel
        </AnimateButton>

        <AnimateButton
          whiteLoading={true}
          type="button"
          onClick={handleSendConfirm}
          isLoading={isLoading}
          isDisabled={
            isLoading ||
            transactionStage === TRANSACTION_STAGES.COMPLETED
          }
          className="bg-black text-white py-2 !border-0 w-full"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </span>
          ) : transactionStage === TRANSACTION_STAGES.COMPLETED ? (
            'Completed!'
          ) : (
            'Confirm'
          )}
        </AnimateButton>
      </div>
    </div>
  );
};

export default PaymentShipping;
