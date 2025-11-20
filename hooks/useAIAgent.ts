import { useState, useEffect, useCallback, useRef } from 'react';
import aiAgentService, {
  AIAgentMessage,
  AIAgentResponse,
  AIAgentExecutionResult,
  AIAgentWallet,
} from '@/services/aiAgentService';

interface UseAIAgentOptions {
  autoConnect?: boolean;
  token?: string;
}

export function useAIAgent(options: UseAIAgentOptions = {}) {
  const { autoConnect = false, token } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIAgentMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [wallet, setWallet] = useState<AIAgentWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const isConnecting = useRef(false);

  /**
   * Connect to AI agent
   */
  const connect = useCallback(
    async (authToken?: string) => {
      if (isConnecting.current || isConnected) return;

      const tokenToUse = authToken || token;
      if (!tokenToUse) {
        setError('No authentication token provided');
        return;
      }

      try {
        isConnecting.current = true;
        setError(null);

        aiAgentService.connect(tokenToUse);

        // Wait for connection
        await new Promise<void>((resolve) => {
          const checkConnection = setInterval(() => {
            if (aiAgentService.isConnected()) {
              clearInterval(checkConnection);
              resolve();
            }
          }, 100);

          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkConnection);
            if (!aiAgentService.isConnected()) {
              setError('Connection timeout');
            }
            resolve();
          }, 5000);
        });

        setIsConnected(true);
      } catch (err: any) {
        console.error('Error connecting to AI agent:', err);
        setError(err.message || 'Failed to connect');
      } finally {
        isConnecting.current = false;
      }
    },
    [token, isConnected]
  );

  /**
   * Disconnect from AI agent
   */
  const disconnect = useCallback(() => {
    aiAgentService.disconnect();
    setIsConnected(false);
    setConversationId(null);
    setMessages([]);
    setIsTyping(false);
    setIsExecuting(false);
    setExecutingAction(null);
  }, []);

  /**
   * Send message to AI agent
   */
  const sendMessage = useCallback(
    async (message: string, walletAddress?: string) => {
      if (!isConnected) {
        throw new Error('Not connected to AI agent');
      }

      try {
        setError(null);
        const response = await aiAgentService.sendMessage(message, walletAddress);
        return response;
      } catch (err: any) {
        console.error('Error sending message:', err);
        setError(err.message || 'Failed to send message');
        throw err;
      }
    },
    [isConnected]
  );

  /**
   * Execute Solana transaction
   */
  const executeTransaction = useCallback(
    async (action: string, params: Record<string, any>, messageId?: string) => {
      if (!isConnected) {
        throw new Error('Not connected to AI agent');
      }

      try {
        setError(null);
        const result = await aiAgentService.executeTransaction(action, params, messageId);
        return result;
      } catch (err: any) {
        console.error('Error executing transaction:', err);
        setError(err.message || 'Failed to execute transaction');
        throw err;
      }
    },
    [isConnected]
  );

  /**
   * Get wallet info
   */
  const getWalletInfo = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Not connected to AI agent');
    }

    try {
      setError(null);
      const walletInfo = await aiAgentService.getWalletInfo();
      setWallet(walletInfo);
      return walletInfo;
    } catch (err: any) {
      console.error('Error getting wallet info:', err);
      setError(err.message || 'Failed to get wallet info');
      throw err;
    }
  }, [isConnected]);

  /**
   * Load more messages (pagination)
   */
  const loadMoreMessages = useCallback(async () => {
    if (!isConnected || !messages.length || isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      setError(null);

      // Get the oldest message ID
      const oldestMessageId = messages[0]._id;

      const result = await aiAgentService.loadMoreMessages(oldestMessageId);

      // Prepend older messages to the beginning of the array
      setMessages((prev) => [...result.messages, ...prev]);
      setHasMore(result.hasMore);
    } catch (err: any) {
      console.error('Error loading more messages:', err);
      setError(err.message || 'Failed to load more messages');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isConnected, messages, isLoadingMore, hasMore]);

  /**
   * Clear messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setHasMore(false);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Setup event listeners
  useEffect(() => {
    // Joined conversation
    const handleJoined = (data: any) => {
      setConversationId(data.conversationId);
      // Load previous messages if they exist
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
      // Set hasMore flag for pagination
      if (typeof data.hasMore === 'boolean') {
        setHasMore(data.hasMore);
      }
    };

    // New message
    const handleNewMessage = (data: { message: AIAgentMessage }) => {
      setMessages((prev) => [...prev, data.message]);
    };

    // Agent response
    const handleResponse = (data: AIAgentResponse) => {
      setMessages((prev) => [...prev, data.message]);
    };

    // Typing indicator
    const handleTyping = (typing: boolean) => {
      setIsTyping(typing);
    };

    // Executing indicator
    const handleExecuting = (data: { executing: boolean; action: string }) => {
      setIsExecuting(data.executing);
      setExecutingAction(data.executing ? data.action : null);
    };

    // Execution result
    const handleExecutionResult = (data: AIAgentExecutionResult) => {
      if (data.message) {
        setMessages((prev) => [...prev, data.message!]);
      }
      // Don't set error state - errors are now sent as regular agent messages
    };

    // Error
    const handleError = (err: any) => {
      console.error('AI Agent error:', err);
      // Don't set error state - errors are now sent as regular agent messages
    };

    // Disconnect
    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // Register listeners
    aiAgentService.on('joined', handleJoined);
    aiAgentService.on('newMessage', handleNewMessage);
    aiAgentService.on('response', handleResponse);
    aiAgentService.on('typing', handleTyping);
    aiAgentService.on('executing', handleExecuting);
    aiAgentService.on('executionResult', handleExecutionResult);
    aiAgentService.on('error', handleError);
    aiAgentService.on('disconnect', handleDisconnect);

    // Cleanup
    return () => {
      aiAgentService.off('joined', handleJoined);
      aiAgentService.off('newMessage', handleNewMessage);
      aiAgentService.off('response', handleResponse);
      aiAgentService.off('typing', handleTyping);
      aiAgentService.off('executing', handleExecuting);
      aiAgentService.off('executionResult', handleExecutionResult);
      aiAgentService.off('error', handleError);
      aiAgentService.off('disconnect', handleDisconnect);
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && token && !isConnected && !isConnecting.current) {
      connect(token);
    }
  }, [autoConnect, token, isConnected, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  return {
    // State
    isConnected,
    conversationId,
    messages,
    isTyping,
    isExecuting,
    executingAction,
    wallet,
    error,
    hasMore,
    isLoadingMore,

    // Actions
    connect,
    disconnect,
    sendMessage,
    executeTransaction,
    getWalletInfo,
    loadMoreMessages,
    clearMessages,
    clearError,
  };
}

export default useAIAgent;
