'use server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface OrderInfo {
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    ens?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  items: Array<{
    itemId: string;
    quantity: number;
    price: number;
    name: string;
    nftType: string;
  }>;
  subtotal: number;
  paymentMethod: 'stripe' | 'wallet';
  paymentIntentId?: string;
  transactionHash?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface PaymentResult {
  success: boolean;
  orderId?: string;
  error?: string;
  redirectUrl?: string;
}

/**
 * Creates a new order in the pending state
 */
export async function createOrder(
  orderInfo: OrderInfo,
  accessToken: string
): Promise<{ orderId: string }> {
  try {
    const response = await fetch(
      `${API_URL}/api/v5/orders/createOrder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(orderInfo),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create order');
    }

    const data = await response.json();
    return { orderId: data.orderId };
  } catch (error) {
    console.error('Error creating order:', error);
    throw new Error('Failed to create order');
  }
}

/**
 * Updates an existing order with payment information
 */
export async function updateOrderPayment(
  orderId: string,
  paymentInfo: {
    paymentIntentId?: string;
    transactionHash?: string;
    status: 'processing' | 'completed' | 'failed';
  },
  accessToken: string
): Promise<PaymentResult> {
  try {
    const response = await fetch(
      `${API_URL}/api/v5/orders/${orderId}/payment`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(paymentInfo),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || 'Failed to update order payment'
      );
    }

    const data = await response.json();

    return {
      success: true,
      orderId,
      redirectUrl: data.redirectUrl || '/payment-success',
    };
  } catch (error) {
    console.error('Error updating order payment:', error);
    return {
      success: false,
      orderId,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update order payment',
    };
  }
}

/**
 * Gets order details by ID
 */
export async function getOrderById(
  orderId: string,
  accessToken: string
): Promise<OrderInfo> {
  try {
    const response = await fetch(
      `${API_URL}/api/v5/orders/${orderId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get order');
    }

    return response.json();
  } catch (error) {
    console.error('Error getting order:', error);
    throw new Error('Failed to get order');
  }
}
