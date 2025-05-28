import React, { memo, useMemo } from 'react';
import { Card, CardBody, Divider } from '@nextui-org/react';
import Image from 'next/image';
import { NFT, OrderData } from '../types/order.types';
import { orderTableHeaders } from '../constants/order.constants';
import {
  calculateItemTotal,
  truncateText,
} from '../utils/order.utils';

interface OrderItemsTableProps {
  nfts: NFT[] | null;
  order: OrderData;
}

const OrderItemsTableComponent: React.FC<OrderItemsTableProps> = memo(
  ({ nfts, order }) => {
    // Memoize financial data extraction
    const financialData = useMemo(() => {
      const { subtotal, discountRate, shippingCost, totalCost } =
        order.financial || {
          subtotal: 0,
          discountRate: 0,
          shippingCost: 0,
          totalCost: 0,
        };

      return {
        subtotal: subtotal || 0,
        discountRate: discountRate || 0,
        shippingCost: shippingCost || 0,
        totalCost: totalCost || 0,
      };
    }, [order.financial]);

    // Memoize NFT rows to prevent re-rendering when data hasn't changed
    const nftRows = useMemo(() => {
      if (!nfts || nfts.length === 0) {
        return (
          <tr>
            <td
              colSpan={4}
              className="py-4 text-center text-gray-500"
            >
              No products found in this order
            </td>
          </tr>
        );
      }

      return nfts.map((nft, index) => (
        <tr
          key={nft._id || `nft-${index}`}
          className="odd:bg-white even:bg-gray-50 border-b border-gray-200 text-base text-gray-800 hover:bg-gray-100 transition-colors"
        >
          <td className="px-6 py-4">
            <div className="flex items-center">
              <div className="w-12 h-12 mr-3">
                {nft?.image ? (
                  <Image
                    src={nft.image}
                    alt={nft.name || 'Product'}
                    width={48}
                    height={48}
                    className="rounded object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder.svg';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-500">
                      No image
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium">
                  {nft.name || 'Unknown Product'}
                </p>
                <p className="text-xs text-gray-500 truncate max-w-xs">
                  {nft.description
                    ? truncateText(nft.description, 60)
                    : 'No description'}
                </p>
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            ${nft.price?.toFixed(2) || '0.00'}
          </td>
          <td className="px-6 py-4">{nft.quantity}</td>
          <td className="px-6 py-4 font-medium">
            ${calculateItemTotal(nft.price, nft.quantity).toFixed(2)}
          </td>
        </tr>
      ));
    }, [nfts]);

    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Order Items</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left">
            <thead className="text-base font-medium text-gray-700 bg-gray-50">
              <tr>
                {orderTableHeaders.map((header, idx) => (
                  <th key={idx} className="px-6 py-3 text-left">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{nftRows}</tbody>
          </table>
        </div>

        {/* Order Summary */}
        <div className="flex flex-col items-end mt-6">
          <Card className="w-full md:w-1/3 bg-gray-50">
            <CardBody className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p>Subtotal</p>
                  <p className="font-medium">
                    ${financialData.subtotal.toFixed(2)}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p>Discount</p>
                  <p className="font-medium text-green-600">
                    -${financialData.discountRate.toFixed(2)}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p>Shipping</p>
                  <p className="font-medium">
                    ${financialData.shippingCost.toFixed(2)}
                  </p>
                </div>
                <Divider />
                <div className="flex justify-between font-bold text-lg pt-2">
                  <p>Total</p>
                  <p>${financialData.totalCost.toFixed(2)}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }
);

OrderItemsTableComponent.displayName = 'OrderItemsTable';

export const OrderItemsTable = OrderItemsTableComponent;
