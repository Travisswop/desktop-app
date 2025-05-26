import React from 'react';
import { Card, CardHeader, Chip, Button } from '@nextui-org/react';
import { CheckCircle, Truck } from 'lucide-react';
import { OrderData, UserRole } from '../types/order.types';

interface OrderHeaderProps {
  order: OrderData;
  userRole: UserRole;
  isCompleted: boolean;
  isUpdating: boolean;
  onMarkComplete: () => void;
  onUpdateShipping: () => void;
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({
  order,
  userRole,
  isCompleted,
  isUpdating,
  onMarkComplete,
  onUpdateShipping,
}) => {
  const getStatusChipColor = () => {
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
  };

  const getStatusText = () => {
    if (order?.orderType !== 'non-phygitals') {
      return order.status.delivery;
    } else {
      return order.status.payment;
    }
  };

  const renderActionButton = () => {
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
          color="primary"
          size="md"
          onPress={onMarkComplete}
          isLoading={isUpdating}
          disabled={order.status.delivery !== 'Completed'}
          startContent={<CheckCircle size={16} />}
        >
          Mark as Complete
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
          color="primary"
          size="md"
          onClick={onUpdateShipping}
          startContent={<Truck size={16} />}
        >
          Update Shipping
        </Button>
      );
    }

    return null;
  };

  return (
    <CardHeader className="flex justify-between items-start p-6 border-b">
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-3">
            {userRole === 'buyer' ? 'My Purchase' : 'Customer Order'}
          </h1>
          <Chip color={getStatusChipColor()}>{getStatusText()}</Chip>
        </div>
        <h4 className="text-gray-500">Order #{order.orderId}</h4>
        <p className="text-sm text-gray-500">
          Placed on {new Date(order.orderDate).toLocaleDateString()}{' '}
          at {new Date(order.orderDate).toLocaleTimeString()}
        </p>
      </div>
      {renderActionButton()}
    </CardHeader>
  );
};
