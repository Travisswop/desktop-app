import React, { memo } from 'react';
import { Card, CardBody, CardHeader } from '@nextui-org/react';
import {
  Package,
  CreditCard as BillingIcon,
  MapPin,
  Truck,
  User,
  Wallet,
  Mail,
  Phone,
} from 'lucide-react';
import { OrderData, Customer } from '../types/order.types';
import { formatAddress } from '../utils/order.utils';

interface DetailItemProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

const DetailItem: React.FC<DetailItemProps> = memo(
  ({ label, value, icon }) => (
    <div className="border-l-2 border-gray-300 pl-4 py-2">
      <p className="text-sm text-gray-500 flex items-center">
        {icon && <span className="mr-2">{icon}</span>}
        {label}:
      </p>
      <p className="text-md font-semibold text-gray-700">
        {value || 'Not provided'}
      </p>
    </div>
  )
);

DetailItem.displayName = 'DetailItem';

interface BillingDetailsSectionProps {
  order: OrderData;
}

const BillingDetailsSection: React.FC<BillingDetailsSectionProps> =
  memo(({ order }) => {
    const billing = order.billing || {};
    const billingAddress = billing.address || {};

    return (
      <Card className="w-full mt-4">
        <CardHeader className="pb-0">
          <div className="flex items-center">
            <BillingIcon className="mr-2" size={18} />
            <h3 className="text-lg font-semibold">Billing Details</h3>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailItem
              label="Name"
              value={
                billing.name || order.buyer?.name || 'Not provided'
              }
            />
            <DetailItem
              label="Email"
              value={
                billing.email || order.buyer?.email || 'Not provided'
              }
            />
            <DetailItem
              label="Billing Address"
              value={formatAddress(billingAddress)}
              icon={<MapPin size={16} />}
            />
          </div>
        </CardBody>
      </Card>
    );
  });

BillingDetailsSection.displayName = 'BillingDetailsSection';

interface ShippingDetailsSectionProps {
  order: OrderData;
}

const ShippingDetailsSection: React.FC<ShippingDetailsSectionProps> =
  memo(({ order }) => {
    const shipping = order.shipping || {};
    const shippingAddress =
      shipping.address || order.buyer?.address || {};

    return (
      <Card className="w-full mt-4">
        <CardHeader className="pb-0">
          <div className="flex items-center">
            <Truck className="mr-2" size={18} />
            <h3 className="text-lg font-semibold">
              Shipping Details
            </h3>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailItem
              label="Shipping Address"
              value={formatAddress(shippingAddress)}
              icon={<MapPin size={16} />}
            />
            {shipping.trackingNumber && (
              <DetailItem
                label="Tracking Number"
                value={shipping.trackingNumber}
                icon={<Truck size={16} />}
              />
            )}
            {shipping.provider && (
              <DetailItem
                label="Shipping Provider"
                value={shipping.provider}
              />
            )}
            {shipping.estimatedDeliveryDate && (
              <DetailItem
                label="Estimated Delivery"
                value={new Date(
                  shipping.estimatedDeliveryDate
                ).toLocaleDateString()}
                icon={<Package size={16} />}
              />
            )}
            {shipping.notes && (
              <DetailItem
                label="Additional Notes"
                value={shipping.notes}
              />
            )}
          </div>
        </CardBody>
      </Card>
    );
  });

ShippingDetailsSection.displayName = 'ShippingDetailsSection';

interface CustomerDetailsProps {
  order: OrderData;
  customer: Customer;
  title: string;
}

export const CustomerDetails: React.FC<CustomerDetailsProps> = memo(
  ({ order, customer, title }) => {
    return (
      <>
        <Card className="w-full">
          <CardHeader className="pb-3">
            <h3 className="text-lg font-semibold">{title}</h3>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailItem
                label="Customer Name"
                value={customer?.name || 'Unknown Customer'}
                icon={<User size={16} />}
              />
              {customer?.wallet?.ens && (
                <DetailItem
                  label="Swop.ID"
                  value={customer.wallet.ens}
                  icon={<Wallet size={16} />}
                />
              )}
              <DetailItem
                label="Email"
                value={customer?.email || 'Unknown Email'}
                icon={<Mail size={16} />}
              />
              <DetailItem
                label="Phone Number"
                value={customer?.phone || 'Not provided'}
                icon={<Phone size={16} />}
              />
            </div>
          </CardBody>
        </Card>

        <BillingDetailsSection order={order} />

        {order?.orderType !== 'non-phygitals' && (
          <ShippingDetailsSection order={order} />
        )}
      </>
    );
  }
);

CustomerDetails.displayName = 'CustomerDetails';
