'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useAIAgent } from '@/hooks/useAIAgent';
import { cn } from '@/lib/utils';
import { useSolanaWallets } from '@privy-io/react-auth';

interface AstroMessage {
  id: string;
  content: string;
  sender: 'user' | 'astro';
  timestamp: Date;
  action?: string;
  params?: any;
  requiresConfirmation?: boolean;
  executionResult?: any;
  isError?: boolean;
}

export default function AstroChatBox() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { wallets: solanaWallets } = useSolanaWallets();
  const {
    isConnected,
    messages: aiMessages,
    sendMessage,
    executeTransaction,
    isTyping,
    isExecuting,
    executingAction,
    wallet,
    error: aiError,
    connect,
    clearError,
  } = useAIAgent({ autoConnect: false, token: accessToken || '' });

  // Get Solana wallet address
  const solanaWalletAddress = solanaWallets[0]?.address || null;

  const [inputValue, setInputValue] = useState('');
  const [localMessages, setLocalMessages] = useState<AstroMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    params: any;
    messageId: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get access token from cookies
  useEffect(() => {
    const getTokenFromCookies = () => {
      if (typeof document === 'undefined') return null;

      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'access-token') {
          const decodedValue = decodeURIComponent(value);

          // Validate token format
          const parts = decodedValue.split('.');
          if (parts.length !== 3) {
            console.error('[AstroChat] Invalid JWT format');
            return null;
          }

          return decodedValue;
        }
      }
      return null;
    };

    // Wait for token with retry logic
    const waitForToken = async (maxRetries = 10, delay = 500): Promise<string | null> => {
      for (let i = 0; i < maxRetries; i++) {
        const token = getTokenFromCookies();
        if (token) {
          return token;
        }
        console.log(`[AstroChat] Waiting for access-token... (attempt ${i + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      return null;
    };

    waitForToken().then((token) => {
      if (token) {
        console.log('[AstroChat] Access token found');
        setAccessToken(token);
      } else {
        console.error('[AstroChat] No access token found');
      }
    });
  }, []);

  // Auto-connect when token is available
  useEffect(() => {
    if (accessToken && !isConnected) {
      connect(accessToken);
    }
  }, [accessToken, isConnected, connect]);

  // Convert AI agent messages to local format
  useEffect(() => {
    const converted = aiMessages.map((msg) => ({
      id: msg._id,
      content: msg.message,
      sender: msg.sender === 'ai-agent' ? ('astro' as const) : ('user' as const),
      timestamp: new Date(msg.createdAt),
      action: msg.agentData?.action,
      params: msg.agentData?.params,
      requiresConfirmation: msg.agentData?.requiresConfirmation,
      executionResult: msg.agentData?.executionResult,
      isError: msg.agentData?.action === 'execution_error',
    }));
    setLocalMessages(converted);
  }, [aiMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, isTyping, isExecuting]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !isConnected) return;

    const message = inputValue.trim();
    setInputValue('');

    try {
      // Pass Solana wallet address along with the message
      const response = await sendMessage(message, solanaWalletAddress || undefined);

      // If action requires confirmation, store it
      if (response.requiresConfirmation && response.action !== 'general_chat') {
        setPendingAction({
          action: response.action,
          params: response.params,
          messageId: response.agentMessage._id,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    try {
      await executeTransaction(
        pendingAction.action,
        pendingAction.params,
        pendingAction.messageId
      );
      setPendingAction(null);
    } catch (error) {
      console.error('Error executing transaction:', error);
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
  };

  const renderMessage = (message: AstroMessage) => {
    const isAstro = message.sender === 'astro';

    return (
      <div
        key={message.id}
        className={`flex ${isAstro ? 'justify-start' : 'justify-end'}`}
      >
        <div className={`flex flex-col ${isAstro ? 'items-start' : 'items-end'}`}>
          <div
            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              isAstro
                ? 'bg-white rounded-bl-none shadow-small'
                : 'bg-gray-300 text-black rounded-br-none'
            }`}
          >
            {isAstro && (
              <div className="text-xs font-medium mb-1 text-blue-600">
                Astro AI
              </div>
            )}
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </div>

            {/* Show action badge if present */}
            {message.action && message.action !== 'general_chat' && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded inline-block',
                    message.isError
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  )}
                >
                  {message.action.replace(/_/g, ' ')}
                </span>
              </div>
            )}

            {/* Show transaction link if execution result exists */}
            {message.executionResult?.signature && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <a
                  href={`https://solscan.io/tx/${message.executionResult.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  View on Solscan →
                </a>
              </div>
            )}
          </div>
          <p className="text-xs mt-1 text-gray-500">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white rounded-xl">
      {/* Chat Header - Matching ChatArea */}
      <div className="px-6 py-4 shadow flex items-center justify-between rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg border-2 border-blue-500">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Astro</h3>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                AI Assistant
              </span>
            </div>
            <p className="text-sm text-gray-700">
              {isConnected ? (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                  Online
                  {wallet && <span> • {wallet.balance.toFixed(4)} SOL</span>}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
                  Connecting...
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area - Matching ChatArea */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {localMessages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Meet Astro, Your Solana AI Assistant
            </h3>
            <p className="text-gray-600 max-w-md">
              I can help you with Solana operations like checking balances,
              transferring SOL, swapping tokens, and answering questions about
              Solana!
            </p>
            <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-md">
              {[
                "What's my SOL balance?",
                'How does Solana work?',
                'Send 0.01 SOL to an address',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInputValue(suggestion)}
                  className="text-left justify-start h-auto py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    <span className="text-xs text-gray-700">{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {localMessages.map(renderMessage)}

        {/* Typing indicator - Matching ChatArea */}
        {isTyping && (
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <div className="typing-dots flex gap-1">
              <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            Astro is typing...
          </div>
        )}

        {/* Executing indicator */}
        {isExecuting && (
          <div className="flex justify-center">
            <div className="px-4 py-2 bg-yellow-50 border border-yellow-300 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-yellow-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Executing {executingAction}...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {aiError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <div className="flex items-center justify-between text-sm text-red-700">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              <span>{aiError}</span>
            </div>
            <button
              onClick={clearError}
              className="text-xs px-2 py-1 hover:bg-red-100 rounded transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {pendingAction && (
        <div className="px-4 py-3 bg-purple-50 border-t border-purple-200">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900 mb-1">
                Confirm this action?
              </p>
              <p className="text-xs text-purple-700">
                Action: {pendingAction.action.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmAction}
              disabled={isExecuting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
                  Executing...
                </>
              ) : (
                'Confirm'
              )}
            </button>
            <button
              onClick={handleCancelAction}
              disabled={isExecuting}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Message Input - Matching ChatArea */}
      <div className="bg-whatsapp-bg-secondary p-4">
        <div className="flex gap-4">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              isConnected
                ? 'Ask Astro anything about Solana...'
                : 'Connecting...'
            }
            disabled={!isConnected}
            className="flex-1 px-4 py-3 rounded-lg border-none focus:outline-none resize-none bg-slate-100"
            rows={1}
            maxLength={2000}
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputValue.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
        {!isConnected && (
          <p className="text-xs text-red-500 mt-2">
            Not connected. Please check your connection.
          </p>
        )}
      </div>
    </div>
  );
}
