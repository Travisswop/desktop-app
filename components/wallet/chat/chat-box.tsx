import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Loader, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePrivy } from '@privy-io/react-auth';
import { useSocketChat, ChatMessage } from '@/lib/context/SocketChatContext';
import { EnhancedMessage } from './enhanced-message';

interface ChatBoxProps {
  conversationId: string;
  recipientId: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  conversationId,
  recipientId,
}) => {
  const { user } = usePrivy();
  const { messages, sendMessage, joinConversation, markAsRead, userPresence, socket } = useSocketChat();
  
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  // Normalize conversation ID consistently - FIXED VERSION
  const normalizeConversationId = (id: string) => {
    if (!id) return '';
    
    // CRITICAL FIX: If it contains both 0x and did:privy:, always put ETH address first
    if (id.includes('0x') && id.includes('did:privy:')) {
      const parts = id.split('_');
      if (parts.length === 2) {
        const ethPart = parts.find(p => p.startsWith('0x'));
        const privyPart = parts.find(p => p.startsWith('did:privy:'));
        if (ethPart && privyPart) {
          return `${ethPart}_${privyPart}`;
        }
      }
    }
    // For other cases where both are same type, sort alphabetically
    else if (id.includes('_')) {
      const parts = id.split('_');
      if (parts.length === 2) {
        // If both are ETH addresses or both are Privy IDs, sort alphabetically
        if ((parts[0].startsWith('0x') && parts[1].startsWith('0x')) ||
            (parts[0].startsWith('did:privy:') && parts[1].startsWith('did:privy:'))) {
          return [...parts].sort().join('_');
        }
        // If mixed types but we didn't catch it above, apply the ETH-first rule
        const ethPart = parts.find(p => p.startsWith('0x'));
        const privyPart = parts.find(p => p.startsWith('did:privy:'));
        if (ethPart && privyPart) {
          return `${ethPart}_${privyPart}`;
        }
        // For any other mixed types, sort alphabetically
        return [...parts].sort().join('_');
      }
    }
    return id;
  };
  
  const normalizedConversationId = normalizeConversationId(conversationId);
  
  // Always use the normalized conversation ID for consistency
  const conversationMessages = (messages[normalizedConversationId] || []).sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  // Debug messages
  console.log(`[DEBUG] Rendering ChatBox for conversation: ${conversationId}`);
  console.log(`[DEBUG] Messages count: ${conversationMessages.length}`);
  console.log(`[DEBUG] All conversations:`, Object.keys(messages).map(id => ({ id, count: messages[id].length })));
  
  // More detailed debugging
  console.log(`[DEBUG DETAIL] Messages state:`, messages);
  console.log(`[DEBUG DETAIL] Current conversation messages:`, conversationMessages);
  
  // Check if we have the correct conversation ID format
  if (conversationId.includes('0x')) {
    const parts = conversationId.split('_');
    if (parts.length === 2) {
      const sortedParts = [...parts].sort();
      const sortedId = sortedParts.join('_');
      if (sortedId !== conversationId) {
        console.warn(`[WARNING] Conversation ID might be in wrong order: ${conversationId}, should be: ${sortedId}`);
        console.log(`[DEBUG] Checking if sorted ID has messages:`, messages[sortedId]?.length || 0);
      }
    }
  }

  // Join conversation when component mounts
  useEffect(() => {
    const setupConversation = async () => {
      setIsLoading(true);
      try {
        console.log(`[ChatBox] Setting up conversation: ${normalizedConversationId}`);
        console.log(`[ChatBox] Original conversation ID: ${conversationId}`);
        
        // Join the conversation with the normalized ID
        await joinConversation(normalizedConversationId);
        
        // Mark messages as read after joining
        if (user?.id) {
          await markAsRead(normalizedConversationId, user.id);
        }
        
        console.log(`[ChatBox] Successfully joined conversation and marked as read`);
    
      } catch (err) {
        console.error('Failed to join conversation:', err);
      } finally {
        setIsLoading(false);
      }
    };

    setupConversation();
  }, [conversationId, normalizedConversationId, joinConversation, user?.id, markAsRead, socket]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;
    
    setIsSending(true);
    try {
      // Use the already normalized conversation ID
      const finalConversationId = normalizedConversationId;
      
      // Determine the correct recipient ID from the conversation ID
      let validRecipientId = recipientId;
      
      // Extract recipient from conversation ID to ensure it's correct
      const parts = finalConversationId.split('_');
      if (parts.length === 2) {
        // Check which part is NOT the current user
        const userEthAddress = user.wallet?.address;
        const userId = user.id;
        
        if (parts[0] === userId || parts[0] === userEthAddress) {
          validRecipientId = parts[1];
        } else if (parts[1] === userId || parts[1] === userEthAddress) {
          validRecipientId = parts[0];
        } else {
          // If neither part matches, use the first part that's not the sender ID
          validRecipientId = parts.find(p => p !== user.id && p !== userEthAddress) || parts[0];
        }
        
        console.log(`[SendMessage] Determined recipient ID: ${validRecipientId} from conversation ${finalConversationId}`);
      }
      
      // Send the message with the final conversation ID and recipient ID
      await sendMessage({
        senderId: user.id,
        recipientId: validRecipientId,
        content: newMessage.trim()
      });
      
      console.log(`[SendMessage] Message sent to ${validRecipientId} in conversation ${finalConversationId}`);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle pressing Enter to send message
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get user online status
  const recipientStatus = userPresence[recipientId]?.status || 'offline';
  const isRecipientOnline = recipientStatus === 'online';


  return (
    <div className="flex flex-col h-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto bg-gray-50/30 dark:bg-gray-900/30" style={{ height: 'calc(100vh - 300px)' }}>
            {conversationMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium mb-2">No messages yet</p>
                  <p className="text-gray-400 text-sm">Start the conversation by sending a message!</p>
                </div>
              </div>
            ) : (
              <div className="py-4">
                {conversationMessages.map((message: ChatMessage, index) => {
                  const isUserMessage = message.senderId === user?.id;
                  
                  // Check if this message should be grouped with the previous one
                  const prevMessage = index > 0 ? conversationMessages[index - 1] : null;
                  const isGrouped = Boolean(prevMessage && 
                    prevMessage.senderId === message.senderId &&
                    // Group messages within 5 minutes of each other
                    new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 5 * 60 * 1000);
                  
                  // Check if this is the last message in a group (next message is from different sender or too far apart)
                  const nextMessage = index < conversationMessages.length - 1 ? conversationMessages[index + 1] : null;
                  const isLastInGroup = !nextMessage || 
                    nextMessage.senderId !== message.senderId ||
                    new Date(nextMessage.createdAt).getTime() - new Date(message.createdAt).getTime() >= 5 * 60 * 1000;
                  
                  return (
                    <EnhancedMessage
                      key={message._id}
                      message={message}
                      isOwnMessage={isUserMessage}
                      isGrouped={isGrouped}
                      isLastInGroup={isLastInGroup}
                    />
                  );
                })}
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          <div className="border-t bg-white dark:bg-gray-800 p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-2xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 placeholder:text-gray-500 text-sm max-h-32"
                  rows={1}
                  style={{
                    minHeight: '44px',
                    lineHeight: '20px'
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="absolute right-2 bottom-2 h-8 w-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-sm disabled:bg-gray-300"
                >
                  {isSending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                {isRecipientOnline ? (
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Offline
                  </span>
                )}
              </div>
              <span className="text-gray-400">Press Enter to send</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatBox;