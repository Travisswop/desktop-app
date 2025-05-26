import React from 'react';
import { Tabs, Tab } from '@nextui-org/react';
import { Clock, Package } from 'lucide-react';
import {
  OrderData,
  NFT,
  ProcessingStage,
  UserRole,
} from '../types/order.types';
import { OrderTimeline } from './OrderTimeline';
import { CustomerDetails } from './CustomerDetails';
import { ProductDetails } from './ProductDetails';

interface OrderTabsProps {
  order: OrderData;
  nfts: NFT[] | null;
  processingStages: ProcessingStage[];
  userRole: UserRole;
  selectedTab: string;
  onTabChange: (key: string) => void;
}

export const OrderTabs: React.FC<OrderTabsProps> = ({
  order,
  nfts,
  processingStages,
  userRole,
  selectedTab,
  onTabChange,
}) => {
  const getCustomerData = () => {
    return userRole === 'seller' ? order.buyer : order.seller;
  };

  const getCustomerTitle = () => {
    return userRole === 'seller'
      ? 'Customer Details'
      : 'Seller Details';
  };

  return (
    <div className="mt-8">
      <Tabs
        aria-label="Order Details"
        selectedKey={selectedTab}
        onSelectionChange={(key) => onTabChange(key as string)}
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
          key="customerDetails"
          title={
            <div className="flex items-center gap-2">
              <Package size={18} />
              <span>{getCustomerTitle()}</span>
            </div>
          }
        >
          <CustomerDetails
            order={order}
            customer={getCustomerData()}
            title={getCustomerTitle()}
          />
        </Tab>

        <Tab key="orderDescription" title="Order Description">
          <ProductDetails nfts={nfts} />
        </Tab>
      </Tabs>
    </div>
  );
};
