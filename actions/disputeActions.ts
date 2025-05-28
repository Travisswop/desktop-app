'use server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface DisputeSubmissionData {
  reason: string;
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface DisputeResponse {
  success: boolean;
  message?: string;
  disputeId?: string;
}

// New interfaces for seller dispute challenges
export interface SellerChallengeData {
  response: string;
  category:
    | 'evidence_provided'
    | 'policy_violation'
    | 'false_claim'
    | 'shipping_proof'
    | 'quality_dispute'
    | 'other';
  evidence: {
    description: string;
    documents: File[];
  };
  requestedAction:
    | 'dismiss_dispute'
    | 'partial_refund'
    | 'replacement'
    | 'store_credit';
  additionalNotes?: string;
}

export interface DisputeChallengeResponse {
  success: boolean;
  message?: string;
  challengeId?: string;
}

export interface DisputeDetails {
  id: string;
  orderId: string;
  reason: string;
  category: string;
  description: string;
  status:
    | 'pending'
    | 'under_review'
    | 'resolved'
    | 'rejected'
    | 'challenged';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  response?: string;
  responseDate?: string;
  documents: DisputeDocument[];
  sellerChallenge?: SellerChallenge;
  buyerInfo: {
    id: string;
    name: string;
    email: string;
  };
}

export interface DisputeDocument {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  downloadUrl: string;
  uploadedAt: string;
}

export interface SellerChallenge {
  id: string;
  response: string;
  category: string;
  evidence: {
    description: string;
    documents: DisputeDocument[];
  };
  requestedAction: string;
  additionalNotes?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  adminResponse?: string;
  adminResponseDate?: string;
}

/**
 * Creates a dispute for an authenticated user's order
 */
export async function createOrderDispute(
  orderId: string,
  disputeData: DisputeSubmissionData,
  accessToken: string
): Promise<DisputeResponse> {
  try {
    if (!API_URL) {
      throw new Error('API base URL is not defined.');
    }

    const response = await fetch(
      `${API_URL}/api/v5/orders/${orderId}/dispute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reason: disputeData.reason,
          category: disputeData.category,
          description: disputeData.description,
          priority: disputeData.priority,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Failed to submit dispute',
      };
    }

    const result = await response.json();
    return {
      success: true,
      message:
        result.message ||
        'Dispute submitted successfully! Our team will review it and contact you soon.',
      disputeId: result.disputeId,
    };
  } catch (error) {
    console.error('Error creating order dispute:', error);
    return {
      success: false,
      message: 'Failed to submit dispute. Please try again later.',
    };
  }
}

/**
 * Gets dispute history for an order
 */
export async function getOrderDisputes(
  orderId: string,
  accessToken: string
): Promise<{
  success: boolean;
  disputes?: any[];
  message?: string;
}> {
  try {
    if (!API_URL) {
      throw new Error('API base URL is not defined.');
    }

    const response = await fetch(
      `${API_URL}/api/v5/orders/${orderId}/disputes`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
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
      disputes: result.data || [],
    };
  } catch (error) {
    console.error('Error fetching order disputes:', error);
    return {
      success: false,
      message: 'Failed to fetch disputes. Please try again later.',
    };
  }
}

/**
 * Creates a seller challenge for a dispute
 */
export async function createSellerChallenge(
  disputeId: string,
  challengeData: SellerChallengeData,
  accessToken: string
): Promise<DisputeChallengeResponse> {
  try {
    if (!API_URL) {
      throw new Error('API base URL is not defined.');
    }

    // Create FormData for file uploads
    const formData = new FormData();
    formData.append('response', challengeData.response);
    formData.append('category', challengeData.category);
    formData.append(
      'evidenceDescription',
      challengeData.evidence.description
    );
    formData.append('requestedAction', challengeData.requestedAction);

    if (challengeData.additionalNotes) {
      formData.append(
        'additionalNotes',
        challengeData.additionalNotes
      );
    }

    // Add documents
    challengeData.evidence.documents.forEach((file, index) => {
      formData.append(`documents`, file);
    });

    const response = await fetch(
      `${API_URL}/api/v5/disputes/${disputeId}/challenge`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Failed to submit challenge',
      };
    }

    const result = await response.json();
    return {
      success: true,
      message:
        result.message ||
        'Challenge submitted successfully! Our team will review it within 24-48 hours.',
      challengeId: result.challengeId,
    };
  } catch (error) {
    console.error('Error creating seller challenge:', error);
    return {
      success: false,
      message: 'Failed to submit challenge. Please try again later.',
    };
  }
}

/**
 * Gets detailed dispute information for sellers
 */
export async function getDisputeDetails(
  disputeId: string,
  accessToken: string
): Promise<{
  success: boolean;
  dispute?: DisputeDetails;
  message?: string;
}> {
  try {
    if (!API_URL) {
      throw new Error('API base URL is not defined.');
    }

    const response = await fetch(
      `${API_URL}/api/v5/disputes/${disputeId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message:
          errorData.message || 'Failed to fetch dispute details',
      };
    }

    const result = await response.json();
    return {
      success: true,
      dispute: result.data,
    };
  } catch (error) {
    console.error('Error fetching dispute details:', error);
    return {
      success: false,
      message:
        'Failed to fetch dispute details. Please try again later.',
    };
  }
}

/**
 * Gets all disputes for a seller's orders
 */
export async function getSellerDisputes(
  accessToken: string,
  filters?: {
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }
): Promise<{
  success: boolean;
  disputes?: DisputeDetails[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
  message?: string;
}> {
  try {
    if (!API_URL) {
      throw new Error('API base URL is not defined.');
    }

    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.priority)
      queryParams.append('priority', filters.priority);
    if (filters?.page)
      queryParams.append('page', filters.page.toString());
    if (filters?.limit)
      queryParams.append('limit', filters.limit.toString());

    const response = await fetch(
      `${API_URL}/api/v5/seller/disputes?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message:
          errorData.message || 'Failed to fetch seller disputes',
      };
    }

    const result = await response.json();
    return {
      success: true,
      disputes: result.data.disputes || [],
      pagination: result.data.pagination,
    };
  } catch (error) {
    console.error('Error fetching seller disputes:', error);
    return {
      success: false,
      message: 'Failed to fetch disputes. Please try again later.',
    };
  }
}
