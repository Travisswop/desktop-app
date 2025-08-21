'use client';

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Loader, Send, Smile, Paperclip, Info, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePrivy } from '@privy-io/react-auth';
import { useSocketChat, ChatMessage, Group } from '@/lib/context/SocketChatContext';
import { format } from 'date-fns';
import ManageGroupMembers from './manage-group-members';

interface GroupChatBoxProps {
  groupId: string;
}

const GroupChatBox: React.FC<GroupChatBoxProps> = ({ groupId }) => {
  const { user } = usePrivy();
  const { 
    messages, 
    sendGroupMessage, 
    joinGroup, 
    groups
  } = useSocketChat();
  
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Get messages for this group
  const groupMessages = messages[groupId] || [];
  
  // Get group details
  const group = groups.find(g => g.groupId === groupId) || null;
  const isAdmin = group?.role === 'admin';
  
  // Join group when component mounts
  useEffect(() => {
    const setupGroup = async () => {
      if (!groupId || !user?.id) return;
      
      setIsLoading(true);
      try {
        console.log(`[GroupChatBox] Setting up group: ${groupId}`);
        await joinGroup(groupId);
      } catch (err) {
        console.error('Failed to join group:', err);
      } finally {
        setIsLoading(false);
      }
    };

    setupGroup();
  }, [groupId, joinGroup, user?.id]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;
    
    setIsSending(true);
    try {
      await sendGroupMessage({
        groupId,
        content: newMessage.trim()
      });
      
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
  
  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch {
      return '';
    }
  };
  
  // Get group avatar URL
  const getGroupAvatarUrl = () => {
    return group?.avatarUrl || '/images/default-group.png';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Group header */}
      {group && (
        <div className="flex items-center gap-3 justify-between border-b bg-white px-4 py-2 sticky top-0 left-0 z-10">
          <div className="flex items-center flex-1 gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getGroupAvatarUrl()} alt={group.name} />
              <AvatarFallback>
                <Users size={20} />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-bold">{group.name}</h1>
              <p className="text-gray-500 text-xs font-medium">
                {group.description || 'No description'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
              title="Group Info"
            >
              <Info className="w-5 h-5" />
            </Button>
            
            {isAdmin && (
              <Button
                onClick={() => setIsManageMembersOpen(true)}
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Manage Members"
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100vh - 300px)' }}>
            {groupMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">No messages yet in this group.</p>
                  <p className="text-gray-400">Start the conversation!</p>
                </div>
              </div>
            ) : (
              groupMessages.map((message: ChatMessage) => {
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
                          {/* Show sender name for non-user messages */}
                          {!isUserMessage && (
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              {message.senderName}
                            </p>
                          )}
                          
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
            
            <div className="flex justify-end mt-2 text-xs text-gray-500">
              <p>
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </>
      )}
      
      {/* Group management dialog */}
      {group && (
        <ManageGroupMembers
          isOpen={isManageMembersOpen}
          onClose={() => setIsManageMembersOpen(false)}
          group={group}
        />
      )}
    </div>
  );
};

export default GroupChatBox;
