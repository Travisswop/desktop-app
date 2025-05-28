import React, { memo } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
} from '@nextui-org/react';
import { CreditCard, Wallet, ExternalLink, Copy } from 'lucide-react';
import { OrderData } from '../types/order.types';
import toast from 'react-hot-toast';

interface PaymentInformationProps {
  order: OrderData;
}

const PaymentInformation: React.FC<PaymentInformationProps> = memo(
  ({ order }) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    const copyToClipboard = (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    };

    const getPaymentStatusColor = () => {
      switch (order.status.payment) {
        case 'completed':
          return 'success';
        case 'processing':
          return 'primary';
        case 'pending':
          return 'warning';
        case 'failed':
        case 'cancelled':
          return 'danger';
        case 'refunded':
          return 'secondary';
        default:
          return 'default';
      }
    };

    const renderStripePaymentDetails = () => {
      if (!order.stripePayment) return null;

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Stripe Payment
            </h3>
          </div>

          {order.stripePayment.paymentMethod && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  Payment Method
                </span>
                <span className="font-medium capitalize">
                  {order.stripePayment.paymentMethod.payment_type ||
                    'Card'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  Card Details
                </span>
                <div className="text-right">
                  <div className="font-medium">
                    {order.stripePayment.paymentMethod.brand?.toUpperCase() ||
                      'CARD'}
                  </div>
                  <div className="text-sm text-gray-500">
                    •••• •••• ••••{' '}
                    {order.stripePayment.paymentMethod.last4 ||
                      '****'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {order.stripePayment.paymentIntentId && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                Payment Intent ID
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-800">
                  {order.stripePayment.paymentIntentId.substring(
                    0,
                    20
                  )}
                  ...
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      order.stripePayment!.paymentIntentId!,
                      'Payment Intent ID'
                    )
                  }
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Copy Payment Intent ID"
                >
                  <Copy className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          )}
        </div>
      );
    };

    const renderWalletPaymentDetails = () => {
      if (!order.walletPayment) return null;

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Wallet Payment
            </h3>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            {order.walletPayment.transactionHash && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  Transaction Hash
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-800">
                    {order.walletPayment.transactionHash.substring(
                      0,
                      10
                    )}
                    ...
                    {order.walletPayment.transactionHash.substring(
                      -8
                    )}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        order.walletPayment!.transactionHash!,
                        'Transaction Hash'
                      )
                    }
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Copy Transaction Hash"
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                  <a
                    href={`https://solscan.io/tx/${order.walletPayment.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-gray-100 rounded"
                    title="View on Solscan"
                  >
                    <ExternalLink className="h-4 w-4 text-gray-500" />
                  </a>
                </div>
              </div>
            )}

            {order.walletPayment.walletAddress && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  Wallet Address
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-800">
                    {order.walletPayment.walletAddress.substring(
                      0,
                      6
                    )}
                    ...
                    {order.walletPayment.walletAddress.substring(-4)}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        order.walletPayment!.walletAddress!,
                        'Wallet Address'
                      )
                    }
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Copy Wallet Address"
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>
            )}

            {order.walletPayment.tokenSymbol &&
              order.walletPayment.tokenAmount && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Token Amount
                  </span>
                  <span className="font-medium">
                    {order.walletPayment.tokenAmount}{' '}
                    {order.walletPayment.tokenSymbol}
                  </span>
                </div>
              )}
          </div>
        </div>
      );
    };

    const renderPaymentSummary = () => (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Payment Summary
        </h3>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Payment Status</span>
          <Chip
            color={getPaymentStatusColor()}
            className="capitalize"
          >
            {order.status.payment}
          </Chip>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Payment Method</span>
          <div className="flex items-center gap-2">
            {order.paymentMethod === 'stripe' ? (
              <CreditCard className="h-4 w-4 text-blue-600" />
            ) : (
              <Wallet className="h-4 w-4 text-purple-600" />
            )}
            <span className="font-medium capitalize">
              {order.paymentMethod || 'Unknown'}
            </span>
          </div>
        </div>

        <Divider />

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">
            {formatCurrency(order.financial.subtotal || 0)}
          </span>
        </div>

        {(order.financial.discountRate || 0) > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Discount</span>
            <span className="font-medium text-green-600">
              -
              {formatCurrency(
                (order.financial.subtotal || 0) *
                  (order.financial.discountRate || 0)
              )}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Shipping</span>
          <span className="font-medium">
            {formatCurrency(order.financial.shippingCost || 0)}
          </span>
        </div>

        <Divider />

        <div className="flex justify-between items-center text-lg">
          <span className="font-semibold">Total Paid</span>
          <span className="font-bold text-green-600">
            {formatCurrency(order.financial.totalCost)}
          </span>
        </div>
      </div>
    );

    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <h2 className="text-xl font-semibold">
              Payment Information
            </h2>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Payment Summary */}
          {renderPaymentSummary()}

          {/* Payment Method Details */}
          {order.paymentMethod === 'stripe' &&
            renderStripePaymentDetails()}
          {order.paymentMethod === 'wallet' &&
            renderWalletPaymentDetails()}
        </CardBody>
      </Card>
    );
  }
);

PaymentInformation.displayName = 'PaymentInformation';

export { PaymentInformation };
