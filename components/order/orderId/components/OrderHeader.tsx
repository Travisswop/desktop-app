import React, { memo, useMemo, useCallback } from 'react';
import { Card, CardHeader, Chip } from '@nextui-org/react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Truck, RefreshCw } from 'lucide-react';
import { OrderData, UserRole } from '../types/order.types';
import {
  DisputeItem,
  shouldShowRefundedTag,
} from '../utils/refundUtils';

interface OrderHeaderProps {
  order: OrderData;
  userRole: UserRole;
  isCompleted: boolean;
  isUpdating: boolean;
  onMarkComplete: () => void;
  onUpdateShipping: () => void;
  disputes?: DisputeItem[];
}

const OrderHeaderComponent: React.FC<OrderHeaderProps> = memo(
  ({
    order,
    userRole,
    isCompleted,
    isUpdating,
    onMarkComplete,
    onUpdateShipping,
    disputes = [],
  }) => {
    // Memoize status chip color calculation
    const statusChipColor = useMemo(() => {
      if (order?.orderType !== 'non-phygitals') {
        switch (order.status.delivery) {
          case 'Completed':
            return 'success';
          case 'In Progress':
            return 'primary';
          case 'Cancelled':
            return 'danger';
          default:
            return 'warning';
        }
      } else {
        switch (order.status.payment) {
          case 'completed':
            return 'success';
          case 'processing':
            return 'primary';
          case 'cancelled':
          case 'failed':
            return 'danger';
          default:
            return 'warning';
        }
      }
    }, [
      order?.orderType,
      order.status.delivery,
      order.status.payment,
    ]);

    // Memoize status text calculation
    const statusText = useMemo(() => {
      if (order?.orderType !== 'non-phygitals') {
        return order.status.delivery;
      } else {
        return order.status.payment;
      }
    }, [
      order?.orderType,
      order.status.delivery,
      order.status.payment,
    ]);

    // Memoize refunded tag visibility
    const showRefundedTag = useMemo(() => {
      return shouldShowRefundedTag(order, disputes);
    }, [order, disputes]);

    // Memoize formatted date strings
    const formattedDate = useMemo(() => {
      const date = new Date(order.orderDate);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
      };
    }, [order.orderDate]);

    // Memoize header title
    const headerTitle = useMemo(() => {
      return userRole === 'buyer' ? 'My Purchase' : 'Customer Order';
    }, [userRole]);

    // Memoize action button rendering
    const actionButton = useMemo(() => {
      if (order?.orderType === 'non-phygitals') return null;

      if (userRole === 'buyer') {
        return isCompleted ? (
          <Chip
            color="success"
            variant="flat"
            size="lg"
            radius="full"
            startContent={<CheckCircle size={16} aria-hidden />}
            className="flex items-center gap-2 px-4 py-1.5 font-semibold"
          >
            Completed
          </Chip>
        ) : (
          <Button
            variant="default"
            size="default"
            onClick={onMarkComplete}
            disabled={
              isUpdating || order.status.delivery !== 'Completed'
            }
            className="flex items-center gap-2"
            title={
              order.status.delivery !== 'Completed'
                ? 'Order must be delivered before it can be completed'
                : ''
            }
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                {order.status.delivery !== 'Completed'
                  ? 'Waiting for Delivery'
                  : 'Mark as Complete'}
              </>
            )}
          </Button>
        );
      }

      if (userRole === 'seller') {
        return order.status.delivery === 'Completed' ? (
          <Chip color="success" variant="flat" size="lg">
            <Truck size={16} className="mr-1" />
            Shipped
          </Chip>
        ) : (
          <Button
            variant="default"
            size="default"
            onClick={onUpdateShipping}
            className="flex items-center gap-2"
          >
            <Truck size={16} />
            Update Shipping
          </Button>
        );
      }

      return null;
    }, [
      order?.orderType,
      order.status.delivery,
      userRole,
      isCompleted,
      isUpdating,
      onMarkComplete,
      onUpdateShipping,
    ]);

    return (
      <CardHeader className="flex justify-between items-start p-6 border-b">
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold mr-3">{headerTitle}</h1>
            <div className="flex items-center gap-2">
              <Chip color={statusChipColor}>{statusText}</Chip>
              {showRefundedTag && (
                <Chip
                  color="warning"
                  variant="flat"
                  size="sm"
                  startContent={<RefreshCw size={14} />}
                  className="bg-orange-100 text-orange-700 font-medium"
                >
                  Refunded
                </Chip>
              )}
            </div>
          </div>
          <h4 className="text-gray-500">Order #{order.orderId}</h4>
          <p className="text-sm text-gray-500">
            Placed on {formattedDate.date} at {formattedDate.time}
          </p>
        </div>
        {actionButton}
      </CardHeader>
    );
  }
);

OrderHeaderComponent.displayName = 'OrderHeader';

export const OrderHeader = OrderHeaderComponent;
