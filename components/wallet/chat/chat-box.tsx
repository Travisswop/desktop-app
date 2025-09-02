import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Loader, Send, Smile, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePrivy } from '@privy-io/react-auth';
import { useSocketChat, ChatMessage } from '@/lib/context/SocketChatContext';
import { format } from 'date-fns';
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
  // Normalize conversation ID consistently
  const normalizeConversationId = (id: string) => {
    if (id.includes('0x') && id.includes('_')) {
      const parts = id.split('_');
      if (parts.length === 2) {
        return [...parts].sort().join('_');
      }
    }
    return id;
  };
  
  const normalizedConversationId = normalizeConversationId(conversationId);
  
  // Always use the normalized conversation ID for consistency
  const conversationMessages = messages[normalizedConversationId] || [];
  
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
        content: newMessage.trim(),
        conversationId: finalConversationId
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

  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100vh - 300px)' }}>
            {conversationMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              conversationMessages.map((message: ChatMessage) => {
                const isUserMessage = message.senderId === user?.id;
                
                return (
                  <EnhancedMessage
                    key={message._id}
                    message={message}
                    conversationId={normalizedConversationId}
                    isOwnMessage={isUserMessage}
                  />
                );
              })
            )}
            <div ref={messageEndRef} />
          </div>

          <div className="border-t p-4">
            <div className="relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="w-full border rounded-xl p-3 pr-20 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
              />
              
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full"
                >
                  <Smile className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="h-8 w-8 rounded-full"
                >
                  {isSending ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <div className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-1 ${
                  isRecipientOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}></span>
                <span>
                  {isRecipientOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <div>
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatBox;