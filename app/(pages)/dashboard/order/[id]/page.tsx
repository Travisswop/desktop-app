// 'use client';

import OrderInfos from "@/components/order/orderId/order-details";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const OrderDetails: React.FC = () => {
  return (
    <>
      <div className="mb-4">
        <Link
          href="/dashboard/order"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
      </div>
      <OrderInfos />
    </>
  );
};

export default OrderDetails;
