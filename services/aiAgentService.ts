import { io, Socket } from 'socket.io-client';

/**
 * AI Agent Service for Frontend
 * Handles real-time communication with AI agent via Socket.IO
 */

export interface AIAgentMessage {
  _id: string;
  sender: string;
  receiver: string;
  message: string;
  messageType: 'text' | 'image' | 'file';
  isAgent: boolean;
  agentData?: {
    action: string;
    params: Record<string, any>;
    requiresConfirmation: boolean;
    executionResult?: any;
    executedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AIAgentResponse {
  message: AIAgentMessage;
  action: string;
  params: Record<string, any>;
  requiresConfirmation: boolean;
  conversationId?: string;
}

export interface AIAgentExecutionResult {
  success: boolean;
  result?: any;
  message?: AIAgentMessage;
  error?: string;
}

export interface AIAgentWallet {
  address: string;
  balance: number;
  isEmbedded: boolean;
}

class AIAgentService {
  private socket: Socket | null = null;
  private conversationId: string | null = null;
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Initialize connection to AI agent
   */
  connect(token: string, baseURL: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000') {
    if (this.socket?.connected) {
      console.log('AI Agent already connected');
      return;
    }

    this.socket = io(baseURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  /**
   * Disconnect from AI agent
   */
  disconnect() {
    if (this.socket) {
      this.socket.emit('leave_ai_agent', {});
      this.socket.disconnect();
      this.socket = null;
      this.conversationId = null;
    }
  }

  /**
   * Setup Socket.IO event listeners
   */
  private setupEventListeners() {
    if (!this.socket) return;

    // Connection established
    this.socket.on('connection_established', (data) => {
      console.log('Connected to server with AI agent support:', data);
      this.joinAIAgent();
    });

    // AI agent joined
    this.socket.on('ai_agent_joined', (data: any) => {
      this.conversationId = data.conversationId;
      this.emit('joined', data);
    });

    // AI agent response
    this.socket.on('ai_agent_response', (data: AIAgentResponse) => {
      this.emit('response', data);
    });

    // AI agent typing indicator
    this.socket.on('ai_agent_typing', (data: { typing: boolean }) => {
      this.emit('typing', data.typing);
    });

    // AI agent executing transaction
    this.socket.on('ai_agent_executing', (data: { executing: boolean; action: string }) => {
      this.emit('executing', data);
    });

    // AI agent execution result
    this.socket.on('ai_agent_execution_result', (data: AIAgentExecutionResult) => {
      this.emit('executionResult', data);
    });

    // New message (user's own message echo)
    this.socket.on('new_message', (data: { message: AIAgentMessage; conversationId: string }) => {
      this.emit('newMessage', data);
    });

    // Connection errors
    this.socket.on('connect_error', (error) => {
      console.error('AI Agent connection error:', error);
      this.emit('error', error);
    });

    // Disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('AI Agent disconnected:', reason);
      this.emit('disconnect', reason);
    });
  }

  /**
   * Join AI agent conversation
   */
  async joinAIAgent(): Promise<{ conversationId: string; agentOnline: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('join_ai_agent', {}, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          this.conversationId = response.conversationId;
          resolve(response);
        }
      });
    });
  }

  /**
   * Send message to AI agent
   */
  async sendMessage(message: string, walletAddress?: string): Promise<AIAgentResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      if (!this.conversationId) {
        reject(new Error('Not joined to AI agent conversation'));
        return;
      }

      this.socket.emit(
        'ai_agent_message',
        {
          message,
          conversationId: this.conversationId,
          walletAddress, // Pass wallet address to backend
        },
        (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Execute Solana transaction
   */
  async executeTransaction(
    action: string,
    params: Record<string, any>,
    messageId?: string
  ): Promise<AIAgentExecutionResult> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      if (!this.conversationId) {
        reject(new Error('Not joined to AI agent conversation'));
        return;
      }

      this.socket.emit(
        'ai_agent_execute',
        {
          action,
          params,
          messageId,
          conversationId: this.conversationId,
        },
        (response: AIAgentExecutionResult) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Get user's wallet info
   */
  async getWalletInfo(): Promise<AIAgentWallet> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('ai_agent_get_wallet', {}, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.wallet);
        }
      });
    });
  }

  /**
   * Register event listener
   */
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unregister event listener
   */
  off(event: string, callback: Function) {
    if (!this.listeners.has(event)) return;

    const listeners = this.listeners.get(event)!;
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit event to registered listeners
   */
  private emit(event: string, data: any) {
    if (!this.listeners.has(event)) return;

    const listeners = this.listeners.get(event)!;
    listeners.forEach((callback) => callback(data));
  }

  /**
   * Get conversation ID
   */
  getConversationId(): string | null {
    return this.conversationId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const aiAgentService = new AIAgentService();
export default aiAgentService;
