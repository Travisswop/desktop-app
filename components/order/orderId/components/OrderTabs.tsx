import React, { memo, useMemo, useCallback } from 'react';
import { Tabs, Tab } from '@nextui-org/react';
import {
  Clock,
  Package,
  AlertTriangle,
  User,
  CreditCard,
  Shield,
} from 'lucide-react';
import {
  OrderData,
  NFT,
  ProcessingStage,
  UserRole,
} from '../types/order.types';
import { OrderTimeline } from './OrderTimeline';
import { CustomerDetails } from './CustomerDetails';
import { ProductDetails } from './ProductDetails';
import { OrderDispute, DisputeData } from './OrderDispute';
import { PaymentInformation } from './PaymentInformation';
import { SellerDisputeManagement } from './SellerDisputeManagement';

interface OrderTabsProps {
  order: OrderData;
  nfts: NFT[] | null;
  processingStages: ProcessingStage[];
  userRole: UserRole;
  selectedTab: string;
  onTabChange: (key: string) => void;
  onDisputeSubmit?: (disputeData: DisputeData) => Promise<void>;
  isDisputeSubmitting?: boolean;
}

export const OrderTabs: React.FC<OrderTabsProps> = memo(
  function OrderTabs({
    order,
    nfts,
    processingStages,
    userRole,
    selectedTab,
    onTabChange,
    onDisputeSubmit,
    isDisputeSubmitting = false,
  }) {
    // Memoize customer data calculation
    const customerData = useMemo(() => {
      return userRole === 'seller' ? order.buyer : order.seller;
    }, [userRole, order.buyer, order.seller]);

    // Memoize customer title calculation
    const customerTitle = useMemo(() => {
      return userRole === 'seller'
        ? 'Customer Details'
        : 'Seller Details';
    }, [userRole]);

    // Memoize dispute capability check
    const canDispute = useMemo(() => {
      return order.orderType !== 'non-phygitals';
    }, [order.orderType]);

    // Memoize tab selection handler
    const handleTabChange = useCallback(
      (key: unknown) => {
        onTabChange(key as string);
      },
      [onTabChange]
    );

    // Memoize dispute submit handler with fallback
    const disputeSubmitHandler = useMemo(() => {
      return onDisputeSubmit || (() => Promise.resolve());
    }, [onDisputeSubmit]);

    return (
      <div className="mt-8">
        <Tabs
          aria-label="Order Details"
          selectedKey={selectedTab}
          onSelectionChange={handleTabChange}
          variant="underlined"
          size="lg"
          classNames={{
            base: 'w-full',
            tabList: 'gap-6',
            tab: 'py-2 px-0',
            tabContent: 'text-base font-medium',
          }}
        >
          <Tab
            key="orderHistory"
            title={
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span>Order Timeline</span>
              </div>
            }
          >
            <OrderTimeline stages={processingStages} />
          </Tab>

          <Tab
            key="paymentInfo"
            title={
              <div className="flex items-center gap-2">
                <CreditCard size={18} />
                <span>Payment Information</span>
              </div>
            }
          >
            <PaymentInformation order={order} />
          </Tab>

          <Tab
            key="customerDetails"
            title={
              <div className="flex items-center gap-2">
                <User size={18} />
                <span>{customerTitle}</span>
              </div>
            }
          >
            <CustomerDetails
              order={order}
              customer={customerData}
              title={customerTitle}
            />
          </Tab>

          <Tab
            key="orderDescription"
            title={
              <div className="flex items-center gap-2">
                <Package size={18} />
                <span>Product Details</span>
              </div>
            }
          >
            <ProductDetails nfts={nfts} />
          </Tab>

          {canDispute && userRole === 'buyer' && (
            <Tab
              key="dispute"
              title={
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} />
                  <span>Dispute Order</span>
                </div>
              }
            >
              <OrderDispute
                order={order}
                userRole={userRole}
                onDisputeSubmit={disputeSubmitHandler}
                isSubmitting={isDisputeSubmitting}
              />
            </Tab>
          )}

          {canDispute && userRole === 'seller' && (
            <Tab
              key="disputeManagement"
              title={
                <div className="flex items-center gap-2">
                  <Shield size={18} />
                  <span>Dispute Management</span>
                </div>
              }
            >
              <SellerDisputeManagement
                orderId={order.orderId}
                userRole={userRole}
              />
            </Tab>
          )}
        </Tabs>
      </div>
    );
  }
);
