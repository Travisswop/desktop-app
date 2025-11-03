'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAIAgent } from '@/hooks/useAIAgent';
import { usePrivyUser } from '@/lib/hooks/usePrivyUser';
import { cn } from '@/lib/utils';

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
  const { jwtToken } = usePrivyUser();
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
  } = useAIAgent({ autoConnect: false, token: jwtToken || '' });

  const [inputValue, setInputValue] = useState('');
  const [localMessages, setLocalMessages] = useState<AstroMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    params: any;
    messageId: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-connect when token is available
  useEffect(() => {
    if (jwtToken && !isConnected) {
      connect(jwtToken);
    }
  }, [jwtToken, isConnected, connect]);

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
      const response = await sendMessage(message);

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (message: AstroMessage) => {
    const isAstro = message.sender === 'astro';

    return (
      <div
        key={message.id}
        className={cn(
          'flex gap-3 mb-4 animate-in fade-in-50 duration-300',
          isAstro ? 'justify-start' : 'justify-end'
        )}
      >
        {isAstro && (
          <Avatar className="h-8 w-8 border-2 border-blue-500">
            <AvatarImage src="/astro-avatar.png" alt="Astro" />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
              🤖
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={cn(
            'flex flex-col max-w-[75%]',
            isAstro ? 'items-start' : 'items-end'
          )}
        >
          <Card
            className={cn(
              'px-4 py-3 rounded-2xl',
              isAstro
                ? 'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800'
                : 'bg-blue-600 text-white border-blue-700'
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>

            {/* Show action badge if present */}
            {message.action && message.action !== 'general_chat' && (
              <div className="mt-2 pt-2 border-t border-current/20">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    message.isError
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : 'bg-blue-100 text-blue-700 border-blue-300'
                  )}
                >
                  {message.action.replace(/_/g, ' ')}
                </Badge>
              </div>
            )}

            {/* Show transaction link if execution result exists */}
            {message.executionResult?.signature && (
              <div className="mt-2 pt-2 border-t border-current/20">
                <a
                  href={`https://solscan.io/tx/${message.executionResult.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  View on Solscan →
                </a>
              </div>
            )}
          </Card>

          <span className="text-xs text-muted-foreground mt-1 px-1">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {!isAstro && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-600 text-white text-xs">
              You
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
        <Avatar className="h-10 w-10 border-2 border-blue-500">
          <AvatarImage src="/astro-avatar.png" alt="Astro" />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            🤖
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">Astro</h2>
            <Badge
              variant="outline"
              className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI Assistant
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isConnected ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>Online</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                <span>Connecting...</span>
              </>
            )}
            {wallet && (
              <span className="text-xs">
                • {wallet.balance.toFixed(4)} SOL
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {localMessages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Meet Astro, Your Solana AI Assistant
            </h3>
            <p className="text-muted-foreground max-w-md">
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
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue(suggestion)}
                  className="text-left justify-start h-auto py-2 px-3"
                >
                  <Sparkles className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span className="text-xs">{suggestion}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {localMessages.map(renderMessage)}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3 mb-4">
            <Avatar className="h-8 w-8 border-2 border-blue-500">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                🤖
              </AvatarFallback>
            </Avatar>
            <Card className="px-4 py-3 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </Card>
          </div>
        )}

        {/* Executing indicator */}
        {isExecuting && (
          <div className="flex justify-center mb-4">
            <Card className="px-4 py-2 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Executing {executingAction}...</span>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Error display */}
      {aiError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between text-sm text-red-700 dark:text-red-300">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              <span>{aiError}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="h-6 px-2"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {pendingAction && (
        <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-t border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
                Confirm this action?
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Action: {pendingAction.action.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleConfirmAction}
              disabled={isExecuting}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Executing...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelAction}
              disabled={isExecuting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isConnected
                ? 'Ask Astro anything about Solana...'
                : 'Connecting...'
            }
            disabled={!isConnected}
            className="flex-1"
            maxLength={2000}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputValue.trim()}
            size="icon"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {!isConnected && (
          <p className="text-xs text-red-500 mt-1">
            Not connected. Please check your connection.
          </p>
        )}
      </div>
    </div>
  );
}
