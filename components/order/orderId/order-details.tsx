// app/orders/[orderId]/page.tsx

"use client";

// import { Tabs } from "@/components/ui/tabs";

import { Switch, Tab, Tabs } from "@nextui-org/react";

import { useUser } from "@/lib/UserContext";
import Image from "next/image";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

// TypeScript Interfaces

interface MintResult {
  id: string;
  onChain: {
    status: "pending" | "success" | "failed";
    chain: "solana" | "ethereum";
  };
  actionId: string;
}

interface MintedNFT {
  _id: string;
  templateId: string;
  mintResult: MintResult;
  name?: string; // Product name fetched from API
  price?: number; // Product price fetched from API
  image?: string; // Product image fetched from API
}

interface OrderData {
  _id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerShippingAddress: string;
  collectionId: string;
  mintedNfts: MintedNFT[];
  totalPriceOfNFTs: number;
  orderDate: string; // ISO string
  deliveryStatus: "Not Initiated" | "In Progress" | "Completed" | "Cancelled";
  edited: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export default function OrderPage() {
  const { accessToken } = useUser();
  const params = useParams();
  // console.log("Params:", params);
  // console.log("token:", accessToken);
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<string | null>(null);
  const [selected, setSelected] = React.useState("orderHistory");

  useEffect(() => {
    console.log("Order ID:", orderId);
    console.log("Access Token:", accessToken);

    if (!orderId) {
      setIsError("Order ID is missing.");
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setIsError("Authentication token is missing.");
      setIsLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      setIsLoading(true);
      setIsError(null);

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        if (!API_URL) {
          throw new Error("API base URL is not defined.");
        }

        // Fetch order details
        const orderResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/orders/${orderId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        // const orderResponse = await response.json();

        // console.log(
        //   `Order Response 12: accessToken}`,
        //   orderResponse,
        //   accessToken
        // );

        // if (!orderResponse) {
        //   throw new Error(
        //     orderResponse.message || "Failed to fetch order data."
        //   );
        // }

        const orderData = await orderResponse.json();
        if (orderData.state !== "success") {
          throw new Error(orderData.message || "Failed to fetch order data.");
        }

        const order = orderData.data.order;

        const templateData = orderData.data.collections;

        // Fetch template details for minted NFTs
        const templates = await Promise.all(
          order.mintedNfts.map(async (nft: MintedNFT) => {
            const templateResponse = await fetch(
              `${API_URL}/api/v1/desktop/nft/getTemplateDetails?collectionId=${order.collectionId}&templateId=${nft.templateId}`,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (!templateResponse.ok) {
              console.warn(
                `Failed to fetch details for Template ID: ${nft.templateId}`
              );
              return { ...nft }; // Return the original NFT if fetching fails
            }

            const templateData = await templateResponse.json();
            if (templateData.state !== "success") {
              console.warn(
                `Failed to fetch details for Template ID: ${nft.templateId}`
              );
              return { ...nft }; // Return the original NFT if fetching fails
            }

            const { name, image, price } = templateData.data.template.metadata;
            return {
              ...nft,
              name,
              image,
              price: templateData.data.template.price,
            };
          })
        );

        // Replace minted NFTs with enriched data
        setOrder({
          ...order,
          mintedNfts: templateData,
        });
      } catch (error: any) {
        console.error("Fetch Error:", error);
        setIsError(error.message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, accessToken]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-red-500">Error: {isError}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg">No order found.</p>
      </div>
    );
  }

  const DetailItem = ({ label, value }) => {
    return (
      <div className="border-l-2 border-gray-300 pl-4">
        <p className="text-sm text-gray-500">{label}:</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    );
  };

  console.log("Order Data:", order);

  return (
    <div className="mx-auto">
      <div className="p-8 bg-white shadow-md rounded-lg">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex flex-col items-start gap-4">
            {/* <div className="w-24 h-24 relative">
              <Image
                src="/placeholder.svg" // Replace with dynamic image if available
                alt="Product"
                width={96}
                height={96}
                className="rounded-lg border"
              />
            </div> */}
            <div>
              <h1 className="text-xl font-semibold">Order #{order.orderId}</h1>
            </div>
          </div>
          {order?.orderType !== "non-phygitals" && (
            <div className="flex items-center gap-2">
              <span className="text-base">Shipped:</span>
              <Switch
                checked={order.deliveryStatus === "Completed"}
                disabled
                className="cursor-not-allowed"
                aria-label="Shipped Status"
              />
            </div>
          )}
        </div>

        {/* Order Items Table */}
        <div className="mb-12 overflow-x-auto max-w-4xl">
          <table className="w-full text-left rtl:text-right text-gray-500 border border-gray-400">
            <thead className="text-[16px] font-medium text-gray-500 text-center bg-[#ffffff] border-b border-gray-400">
              <tr>
                {["Product Name", "Product Image", "Quantity", "Price"].map(
                  (header, idx) => (
                    <th
                      key={idx}
                      className="px-6 py-3 text-center border-r border-gray-400"
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {order?.mintedNfts?.map((el) => (
                <tr
                  key={el}
                  className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b border-gray-400 text-[16px] font-medium text-gray-800 text-center "
                >
                  <td className="border-r border-gray-400">
                    {el.name || "Unknown Product"}
                  </td>
                  <td className="border-r flex items-center justify-center border-gray-400">
                    <Image
                      src={el?.image || "/placeholder.svg"}
                      alt="Product Image"
                      width={30}
                      height={30}
                    />
                  </td>
                  <td className="border-r border-gray-400">1</td>
                  <td className="">
                    <div className="">${el.price?.toFixed(2) || "0.00"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col justify-end items-end mt-4 mx-1 text-left space-y-2">
            <div className="text-sm flex items-center justify-between w-36">
              <p>Subtotal</p> <p>$ {order?.financial?.subtotal}</p>
            </div>
            <div className="text-sm flex items-center justify-between w-36">
              <p> Discount Rate</p> <p>$ {order?.financial?.discountRate}</p>
            </div>
            <div className="text-sm flex items-center justify-between w-36">
              <p> Shipping Cost </p> <p>$ {order?.financial?.shippingCost}</p>
            </div>

            <div className="border-b border-gray-400 w-52" />
            <div className="text-sm flex items-center justify-between w-36">
              <p> Total Cost </p> <p>$ {order?.financial?.totalCost}</p>
            </div>
          </div>
        </div>

        {/* Tabs Section */}

        <div className="flex w-full flex-col">
          <Tabs
            aria-label="Options"
            selectedKey={selected}
            onSelectionChange={setSelected}
            variant="underlined"
            size="large"
          >
            <Tab key="orderHistory" title="Order History" className="w-2/6">
              <div className="max-w-md  bg-white rounded p-3">
                <div className="space-y-4">
                  {order?.processingStages?.map((item: any, idx: number) => (
                    <DetailItem
                      key={idx}
                      label="Processing Stages"
                      value={item?.stage}
                    />
                  ))}
                </div>
              </div>
            </Tab>
            <Tab
              key="customerDetails"
              title="Customer Details"
              className="w-2/6"
            >
              <div className="max-w-md  bg-white rounded p-3">
                <div className="space-y-4">
                  <DetailItem label="Swop.ID" value="Travis.swop.id" />
                  <DetailItem
                    label="Customer Name"
                    value={order?.customer?.name || "Unknown Customer"}
                  />
                  <DetailItem label="Customer Number" value="+8801318470354" />
                  <DetailItem
                    label="Customer Email"
                    value={order?.customer?.name || "Unknown Customer"}
                  />
                  <DetailItem
                    label="Customer Address"
                    value={
                      order?.customer?.shippingAddress || "Unknown Customer"
                    }
                  />
                  <DetailItem
                    label="Shipping Address"
                    value={
                      order?.customer?.shippingAddress || "Unknown Customer"
                    }
                  />
                </div>
              </div>
            </Tab>
            <Tab
              key="orderDescription"
              title="Order Description"
              className="w-3/6"
            >
              <div className="max-w-2xl  bg-white rounded p-3">
                <div className="space-y-4">
                  <div className="border-l-2 border-gray-300 pl-4">
                    <p className=" text-lg font-semibold text-gray-500">
                      Order Description:
                    </p>
                  </div>
                  {order?.mintedNfts?.map((item: any, idx: number) => (
                    <div className="border-l-2 border-gray-300 pl-4" key={idx}>
                      <p className="text-sm text-gray-900">
                        {item?.description || "No Description"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
