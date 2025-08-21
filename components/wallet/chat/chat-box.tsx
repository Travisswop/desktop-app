import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Loader, Send, Smile, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePrivy } from '@privy-io/react-auth';
import { useSocketChat, ChatMessage } from '@/lib/context/SocketChatContext';
import { format } from 'date-fns';

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
  // Get the normalized conversation ID (sorted ETH addresses)
  let normalizedConversationId = conversationId;
  if (conversationId.includes('0x')) {
    const parts = conversationId.split('_');
    if (parts.length === 2) {
      const sortedParts = [...parts].sort();
      normalizedConversationId = sortedParts.join('_');
    }
  }
  
  // Check both the original and normalized conversation IDs for messages
  const conversationMessages = 
    messages[conversationId] || 
    (normalizedConversationId !== conversationId ? messages[normalizedConversationId] : []) || 
    [];
  
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
        
        // Always use the normalized conversation ID
        if (normalizedConversationId !== conversationId) {
          console.log(`[ChatBox] Using normalized conversation ID: ${normalizedConversationId} instead of ${conversationId}`);
        }
        
        // Join the conversation with the normalized ID
        await joinConversation(normalizedConversationId);
        
        if (user?.id) {
          await markAsRead(normalizedConversationId, user.id);
        }
    
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
      // Normalize conversation ID if it contains ETH addresses
      let normalizedConversationId = conversationId;
      
      if (conversationId.includes('0x')) {
        const parts = conversationId.split('_');
        if (parts.length === 2) {
          // Sort to ensure consistent ordering
          const sortedParts = [...parts].sort();
          normalizedConversationId = sortedParts.join('_');
          
          if (normalizedConversationId !== conversationId) {
            console.log(`[SendMessage] Normalizing conversation ID from ${conversationId} to ${normalizedConversationId}`);
          }
        }
      }
      
      // Validate recipient ID format
      let validRecipientId = recipientId;
      
      // If recipient ID is not in the right format, try to extract it from the conversation ID
      if (!recipientId.startsWith('did:privy:') && !recipientId.startsWith('0x') && normalizedConversationId) {
        console.log('Attempting to extract valid recipient ID from conversation ID');
        const parts = normalizedConversationId.split('_');
        if (parts.length === 2) {
          validRecipientId = parts[0] === user.id ? parts[1] : parts[0];
          
          // If user has an ETH address and it's in the conversation ID, use that to determine recipient
          if (user.wallet?.address) {
            validRecipientId = parts[0] === user.wallet.address ? parts[1] : parts[0];
          }
          
          console.log(`Extracted recipient ID from conversation: ${validRecipientId}`);
        }
      }
      
      // Send the message with the normalized conversation ID
      // First, ensure we're joined to the correct conversation
      if (normalizedConversationId !== conversationId) {
        console.log(`[SendMessage] Joining normalized conversation: ${normalizedConversationId}`);
        await joinConversation(normalizedConversationId);
      }
      
      // Then send the message
      await sendMessage({
        senderId: user.id,
        recipientId: validRecipientId,
        content: newMessage.trim()
      });
      
      console.log(`[SendMessage] Message sent to ${validRecipientId} in conversation ${normalizedConversationId}`);
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
                  <div
                    key={message._id}
                    className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end gap-2 max-w-[80%] ${isUserMessage ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarImage 
                          src={message.senderImage || '/default-avatar.png'} 
                          alt={message.senderName} 
                        />
                        <AvatarFallback>
                          {message.senderName?.substring(0, 1) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={`rounded-2xl px-4 py-2 ${
                        isUserMessage 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <div className="flex flex-col">
                          <p className="break-words">{message.content}</p>
                          
                          {message.attachment && (
                            <a 
                              href={message.attachment} 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline mt-1"
                            >
                              Attachment
                            </a>
                          )}
                          
                          <div className={`text-xs mt-1 ${
                            isUserMessage ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatMessageTime(message.createdAt)}
                            {message.edited && (
                              <span className="ml-1">(edited)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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