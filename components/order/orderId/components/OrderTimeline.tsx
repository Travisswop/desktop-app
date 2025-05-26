import React, { memo, useMemo, useCallback } from 'react';
import { Card, CardBody, Chip } from '@nextui-org/react';
import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  CreditCard,
  ShoppingCart,
} from 'lucide-react';
import {
  ProcessingStage,
  StageKey,
  StatusKey,
} from '../types/order.types';
import {
  stageDisplayNames,
  statusDisplayNames,
} from '../constants/order.constants';
import {
  createDateFormatter,
  formatDate,
} from '../utils/order.utils';

interface OrderTimelineProps {
  stages: ProcessingStage[];
}

const stageIcons = {
  order_created: <ShoppingCart size={20} />,
  payment_verified: <CreditCard size={20} />,
  nft_minted: <Package size={20} />,
  shipping_prepared: <Truck size={20} />,
  completed: <CheckCircle size={20} />,
  stripe_payment: <CreditCard size={20} />,
  guest_receipt: <CreditCard size={20} />,
};

export const OrderTimeline: React.FC<OrderTimelineProps> = memo(
  ({ stages }) => {
    // Memoize date formatter
    const dateFormatter = useMemo(() => createDateFormatter(), []);

    const formatTimestamp = useCallback(
      (dateString: string) => formatDate(dateString, dateFormatter),
      [dateFormatter]
    );

    const getChipColor = useCallback((status: StatusKey) => {
      switch (status) {
        case 'completed':
          return 'success';
        case 'pending':
          return 'warning';
        case 'failed':
          return 'danger';
        default:
          return 'primary';
      }
    }, []);

    return (
      <Card className="w-full">
        <CardBody className="p-6">
          <div className="space-y-0">
            {stages.map((stage, index) => {
              const isCompleted = stage.status === 'completed';
              const isLast = index === stages.length - 1;
              const stageKey = stage.stage as StageKey;
              const statusKey = stage.status as StatusKey;

              return (
                <div key={stage.stage} className="relative">
                  <div className="flex items-start">
                    <div className="flex flex-col items-center mr-4">
                      <div
                        className={`flex-shrink-0 p-2 rounded-full ${
                          isCompleted ? 'bg-green-100' : 'bg-gray-100'
                        }`}
                      >
                        {stageIcons[stageKey] ||
                          (isCompleted ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-400" />
                          ))}
                      </div>
                      {!isLast && (
                        <div
                          className={`h-full w-0.5 ${
                            isCompleted
                              ? 'bg-green-300'
                              : 'bg-gray-300'
                          } mt-1`}
                          style={{ height: '40px' }}
                        />
                      )}
                    </div>

                    <div className="pb-8">
                      <p className="font-medium text-gray-900">
                        {stageDisplayNames[stageKey] || stage.stage}
                      </p>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500">
                          {formatTimestamp(stage.timestamp)}
                        </span>
                        <Chip
                          className="ml-2"
                          size="sm"
                          color={getChipColor(statusKey)}
                          variant="flat"
                        >
                          {statusDisplayNames[statusKey] ||
                            stage.status}
                        </Chip>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    );
  }
);

OrderTimeline.displayName = 'OrderTimeline';
