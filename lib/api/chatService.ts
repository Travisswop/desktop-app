// Chat service for API interactions with the new backend
const API_BASE_URL = process.env.NEXT_PUBLIC_CHAT_API_URL || 'http://localhost:5000';

interface CreateMessageRequest {
  receiverId: string;
  message: string;
  messageType?: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: string;
}

// Removed unused interfaces - using inline parameters instead

interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data: T;
}

class ChatApiService {
  private getAuthHeaders() {
    // Get JWT token from localStorage (same as socket connection)
    const token = localStorage.getItem('authToken') || localStorage.getItem('jwt_token') || localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Send message via REST API
  async sendMessage(data: CreateMessageRequest) {
    return this.request<any>('/api/v1/chat/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get conversation history
  async getConversation(receiverId: string, page = 1, limit = 50) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<any>(`/api/v1/chat/conversation/${receiverId}?${params}`);
  }

  // Get user's conversations
  async getConversations(page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<any>(`/api/v1/chat/conversations?${params}`);
  }

  // Mark messages as read
  async markMessagesAsRead(senderId: string) {
    return this.request<any>(`/api/v1/chat/messages/read/${senderId}`, {
      method: 'PATCH',
    });
  }

  // Get unread message count
  async getUnreadCount() {
    return this.request<any>('/api/v1/chat/messages/unread');
  }

  // Delete message
  async deleteMessage(messageId: string) {
    return this.request<any>(`/api/v1/chat/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // Edit message
  async editMessage(messageId: string, message: string) {
    return this.request<any>(`/api/v1/chat/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ message }),
    });
  }

  // Search messages
  async searchMessages(query: string, page = 1, limit = 20) {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<any>(`/api/v1/chat/messages/search?${params}`);
  }

  // Block user
  async blockUser(userId: string) {
    return this.request<any>(`/api/v1/chat/block/${userId}`, {
      method: 'POST',
    });
  }

  // Unblock user
  async unblockUser(userId: string) {
    return this.request<any>(`/api/v1/chat/unblock/${userId}`, {
      method: 'POST',
    });
  }

  // Check if users can chat
  async canUsersChat(userId: string) {
    return this.request<any>(`/api/v1/chat/can-chat/${userId}`);
  }

  // Get conversation info
  async getConversationInfo(receiverId: string) {
    return this.request<any>(`/api/v1/chat/conversation-info/${receiverId}`);
  }

  // Get chat statistics
  async getChatStats(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return this.request<any>(`/api/v1/chat/stats?${params}`);
  }
}

export const chatApiService = new ChatApiService();
export default chatApiService;