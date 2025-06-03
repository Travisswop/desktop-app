const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface DisputeSubmissionData {
  reason: string;
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  documents?: File[];
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
  console.log('createOrderDispute called with:', {
    orderId,
    disputeData,
    hasAccessToken: !!accessToken,
  });

  try {
    if (!API_URL) {
      console.error('API_URL is not defined');
      throw new Error('API base URL is not defined.');
    }

    if (!orderId) {
      console.error('orderId is missing');
      throw new Error('Order ID is required.');
    }

    if (!accessToken) {
      console.error('accessToken is missing');
      throw new Error('Access token is required.');
    }

    if (!disputeData) {
      console.error('disputeData is missing');
      throw new Error('Dispute data is required.');
    }

    let requestBody: BodyInit;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    // Check if files are present to determine request format
    if (disputeData.documents && disputeData.documents.length > 0) {
      console.log(
        'Using FormData for file upload, files count:',
        disputeData.documents.length
      );
      // Use FormData for file uploads
      const formData = new FormData();
      formData.append('reason', disputeData.reason);
      formData.append('category', disputeData.category);
      formData.append('description', disputeData.description);
      formData.append('priority', disputeData.priority);

      // Add documents
      disputeData.documents.forEach((file, index) => {
        console.log(
          `Adding file ${index}:`,
          file.name,
          'size:',
          file.size,
          'type:',
          file.type
        );
        formData.append('documents', file);
      });

      requestBody = formData;
      // Don't set Content-Type for FormData - browser will set it with boundary
    } else {
      console.log('Using JSON format for text-only submission');
      // Use JSON for text-only submissions
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify({
        reason: disputeData.reason,
        category: disputeData.category,
        description: disputeData.description,
        priority: disputeData.priority,
      });
    }

    const response = await fetch(
      `${API_URL}/api/v5/orders/${orderId}/dispute`,
      {
        method: 'POST',
        headers,
        body: requestBody,
      }
    );

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('API error response:', errorData);
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        errorData = {
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      return {
        success: false,
        message: errorData.message || 'Failed to submit dispute',
      };
    }

    const result = await response.json();
    console.log('Success response:', result);

    return {
      success: true,
      message:
        result.message ||
        'Dispute submitted successfully! Our team will review it and contact you soon.',
      disputeId: result.disputeId,
    };
  } catch (error) {
    console.error('Error creating order dispute:', error);
    console.error(
      'Error stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    );

    // Ensure we always return a proper response structure
    const response: DisputeResponse = {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to submit dispute. Please try again later.',
    };

    console.log('Returning error response:', response);
    return response;
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
  dispute?: any;
  message?: string;
}> {
  try {
    if (!API_URL) {
      throw new Error('API base URL is not defined.');
    }

    const response = await fetch(
      `${API_URL}/api/v5/orders/${orderId}/dispute`,
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
      dispute: result.data,
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
      `${API_URL}/api/v5/seller/disputes/${disputeId}/challenge`,
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

/**
 * Get notification count for seller (pending disputes, challenges, etc.)
 */
export async function getSellerNotificationCount(
  accessToken: string
): Promise<{
  success: boolean;
  counts?: {
    pendingDisputes: number;
    pendingChallenges: number;
    totalNotifications: number;
  };
  message?: string;
}> {
  try {
    if (!API_URL) {
      throw new Error('API base URL is not defined.');
    }

    const response = await fetch(
      `${API_URL}/api/v5/seller/notifications/count`,
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
          errorData.message || 'Failed to fetch notification counts',
      };
    }

    const result = await response.json();
    return {
      success: true,
      counts: result.data || {
        pendingDisputes: 0,
        pendingChallenges: 0,
        totalNotifications: 0,
      },
    };
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    return {
      success: false,
      message: 'Failed to fetch notification counts.',
    };
  }
}
