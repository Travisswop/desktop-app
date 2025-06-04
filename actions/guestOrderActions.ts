'use server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface VerifyGuestOrderParams {
  orderId: string;
  email: string;
}

interface GuestOrderConfirmationParams {
  orderId: string;
  email: string;
  rating: number;
  feedback: string;
}

interface GuestOrderDisputeParams {
  orderId: string;
  email: string;
  reason: string;
  category?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Verifies guest order credentials
 */
export async function verifyGuestOrder({
  orderId,
  email,
}: VerifyGuestOrderParams): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const response = await fetch(
      `${API_URL}/api/v5/guest-orders/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, email }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Invalid Order ID or Email',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error verifying guest order:', error);
    return {
      success: false,
      message:
        'Failed to verify guest order. Please try again later.',
    };
  }
}

/**
 * Gets guest order details by ID
 */
export async function getGuestOrderById(
  orderId: string,
  email: string
): Promise<any> {
  try {
    const response = await fetch(
      `${API_URL}/api/v5/guest-orders/${orderId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Email': email,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get order');
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting guest order:', error);
    throw new Error('Failed to get guest order details');
  }
}

/**
 * Confirms receipt of a guest order
 */
export async function confirmGuestOrderReceipt({
  orderId,
  email,
  rating,
  feedback,
}: GuestOrderConfirmationParams): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const response = await fetch(
      `${API_URL}/api/v5/guest-orders/${orderId}/confirm-receipt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Email': email,
        },
        body: JSON.stringify({ rating, feedback }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message:
          errorData.message || 'Failed to confirm order receipt',
      };
    }

    return {
      success: true,
      message: 'Order confirmed successfully!',
    };
  } catch (error) {
    console.error('Error confirming guest order receipt:', error);
    return {
      success: false,
      message:
        'Failed to confirm order receipt. Please try again later.',
    };
  }
}

/**
 * Creates a dispute for a guest order with enhanced data
 */
export async function createGuestOrderDispute({
  orderId,
  email,
  reason,
  category = 'other',
  description = '',
  priority = 'medium',
}: GuestOrderDisputeParams): Promise<{
  success: boolean;
  message?: string;
  disputeId?: string;
}> {
  try {
    const response = await fetch(
      `${API_URL}/api/v5/guest-orders/${orderId}/dispute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Email': email,
        },
        body: JSON.stringify({
          reason,
          category,
          description,
          priority,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Failed to create dispute',
      };
    }

    const result = await response.json();
    return {
      success: true,
      message:
        result.message ||
        'Dispute submitted successfully! Our team will contact you soon.',
      disputeId: result.disputeId,
    };
  } catch (error) {
    console.error('Error creating guest order dispute:', error);
    return {
      success: false,
      message: 'Failed to submit dispute. Please try again later.',
    };
  }
}

/**
 * Gets guest order disputes by ID and email
 */
export async function getGuestOrderDisputes(
  orderId: string,
  email: string
): Promise<{
  success: boolean;
  dispute?: any;
  message?: string;
}> {
  try {
    const response = await fetch(
      `${API_URL}/api/v5/guest-orders/${orderId}/dispute`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Email': email,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Failed to fetch disputes',
      };
    }

    const result = await response.json();
    return {
      success: true,
      dispute: result.data,
    };
  } catch (error) {
    console.error('Error fetching guest order disputes:', error);
    return {
      success: false,
      message: 'Failed to fetch disputes. Please try again later.',
    };
  }
}
