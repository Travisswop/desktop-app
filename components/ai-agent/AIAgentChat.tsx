'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAIAgent } from '@/hooks/useAIAgent';
import { Button } from '@nextui-org/react';
import { Input } from '@nextui-org/react';
import { Card, CardBody } from '@nextui-org/react';
import { Spinner } from '@nextui-org/react';

interface AIAgentChatProps {
  token: string;
  onClose?: () => void;
}

export function AIAgentChat({ token, onClose }: AIAgentChatProps) {
  const {
    isConnected,
    messages,
    isTyping,
    isExecuting,
    executingAction,
    wallet,
    error,
    connect,
    disconnect,
    sendMessage,
    executeTransaction,
    getWalletInfo,
    clearError,
  } = useAIAgent({ autoConnect: true, token });

  const [inputMessage, setInputMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    params: any;
    messageId: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get wallet info on connect
  useEffect(() => {
    if (isConnected) {
      getWalletInfo().catch(console.error);
    }
  }, [isConnected, getWalletInfo]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || !isConnected) return;

    const message = inputMessage.trim();
    setInputMessage('');

    try {
      // Pass wallet address to backend for context
      const response = await sendMessage(message, wallet?.address);

      // If action requires confirmation, store it
      if (response.requiresConfirmation && response.action !== 'general_chat') {
        setPendingAction({
          action: response.action,
          params: response.params,
          messageId: response.agentMessage._id,
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
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
    } catch (err) {
      console.error('Error executing transaction:', err);
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
            AI
          </div>
          <div>
            <h2 className="font-semibold text-lg">Solana AI Assistant</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span>{isConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        {onClose && (
          <Button
            isIconOnly
            variant="light"
            onPress={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </Button>
        )}
      </div>

      {/* Wallet Info */}
      {wallet && (
        <div className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20">
          <div className="text-sm">
            <div className="font-medium">Your Wallet</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {wallet.address}
            </div>
            <div className="font-bold mt-1">{wallet.balance.toFixed(4)} SOL</div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-lg font-medium">Start chatting with the AI!</p>
            <p className="text-sm mt-2">
              You can ask me to transfer SOL, check balances, swap tokens, and more.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isAgent = msg.sender === 'ai-agent';
          return (
            <div
              key={msg._id}
              className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}
            >
              <Card
                className={`max-w-[80%] ${
                  isAgent
                    ? 'bg-gray-100 dark:bg-gray-800'
                    : 'bg-blue-500 text-white'
                }`}
              >
                <CardBody className="p-3">
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  {msg.agentData?.executionResult && (
                    <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600 text-xs">
                      {msg.agentData.executionResult.signature && (
                        <a
                          href={`https://solscan.io/tx/${msg.agentData.executionResult.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View on Solscan →
                        </a>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <Card className="bg-gray-100 dark:bg-gray-800">
              <CardBody className="p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {isExecuting && (
          <div className="flex justify-center">
            <Card className="bg-yellow-100 dark:bg-yellow-900/20">
              <CardBody className="p-3 flex flex-row items-center gap-2">
                <Spinner size="sm" />
                <span className="text-sm">
                  Executing {executingAction}...
                </span>
              </CardBody>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <Button size="sm" variant="light" onPress={clearError}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Pending Action Confirmation */}
      {pendingAction && (
        <div className="px-4 py-3 bg-purple-100 dark:bg-purple-900/20 border-t border-purple-200 dark:border-purple-800">
          <p className="text-sm font-medium mb-2">Confirm this action?</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Action: {pendingAction.action}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              color="primary"
              onPress={handleConfirmAction}
              isLoading={isExecuting}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="flat"
              onPress={handleCancelAction}
              isDisabled={isExecuting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t dark:border-gray-700">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={!isConnected}
            maxLength={2000}
            className="flex-1"
          />
          <Button
            type="submit"
            color="primary"
            isDisabled={!isConnected || !inputMessage.trim()}
          >
            Send
          </Button>
        </div>
        {!isConnected && (
          <p className="text-xs text-red-500 mt-1">
            Not connected. Please check your connection.
          </p>
        )}
      </form>
    </div>
  );
}

export default AIAgentChat;
