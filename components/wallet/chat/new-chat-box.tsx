import React, {
  useState,
  useEffect,
  useRef,
  KeyboardEvent,
} from 'react';
import {
  Loader,
  Send,
  MoreHorizontal,
  Reply,
  Edit3,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import {
  useNewSocketChat,
  ChatMessage,
} from '@/lib/context/NewSocketChatContext';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { format, isToday, isYesterday } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NewChatBoxProps {
  conversationId: string;
  receiverId: string;
}

const NewChatBox: React.FC<NewChatBoxProps> = ({
  conversationId,
  receiverId,
}) => {
  const { user } = usePrivy();
  const {
    messages,
    sendMessage,
    getConversation,
    markMessagesAsRead,
    deleteMessage,
    editMessage,
    joinConversation,
    isConnected,
    socket,
  } = useNewSocketChat();

  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<
    string | null
  >(null);
  const [editingContent, setEditingContent] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Get conversation messages
  const conversationKey = getConversationKey(
    user?.id || '',
    receiverId
  );
  const conversationMessages = (messages[conversationKey] || []).sort(
    (a, b) =>
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime()
  );

  console.log(`[NewChatBox] Rendering for receiver: ${receiverId}`);
  console.log(`[NewChatBox] Conversation key: ${conversationKey}`);
  console.log(
    `[NewChatBox] Messages count: ${conversationMessages.length}`
  );

  // Helper to create conversation key
  function getConversationKey(userId1: string, userId2: string) {
    return [userId1, userId2].sort().join('_');
  }

  // Load conversation when component mounts
  useEffect(() => {
    const loadConversation = async () => {
      if (!user?.id || !receiverId) return;

      setIsLoading(true);
      try {
        console.log(
          `[NewChatBox] Loading conversation with ${receiverId}`
        );

        // First join the conversation (like in HTML test)
        const joinResult = await joinConversation(receiverId);
        if (joinResult.success) {
          console.log(
            `[NewChatBox] Successfully joined conversation`
          );
        } else {
          console.error(
            `[NewChatBox] Failed to join conversation: ${joinResult.error}`
          );
        }

        // Then load conversation history
        const result = await getConversation(receiverId, 1, 50);
        if (result.success) {
          console.log(
            `[NewChatBox] Loaded ${
              result.data.messages?.length || 0
            } messages`
          );

          // Mark messages as read
          await markMessagesAsRead(receiverId);
        } else {
          console.error(
            `[NewChatBox] Failed to load conversation: ${result.error}`
          );
        }
      } catch (error) {
        console.error(
          '[NewChatBox] Error loading conversation:',
          error
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (isConnected) {
      loadConversation();
    }
  }, [
    receiverId,
    user?.id,
    isConnected,
    joinConversation,
    getConversation,
    markMessagesAsRead,
  ]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [newMessage]);

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current)
        clearTimeout(typingTimerRef.current);
      if (
        isTypingRef.current &&
        socket &&
        isConnected &&
        receiverId
      ) {
        socket.emit('typing_stop', { receiverId });
        isTypingRef.current = false;
      }
    };
  }, [socket, isConnected, receiverId]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id || isSending) return;

    setIsSending(true);
    const messageContent = newMessage.trim();

    try {
      const success = await sendMessage(
        receiverId,
        messageContent,
        'text'
      );

      if (success) {
        console.log('[NewChatBox] Message sent successfully');
        setNewMessage('');
        // Stop typing immediately after send
        if (
          isTypingRef.current &&
          socket &&
          isConnected &&
          receiverId
        ) {
          socket.emit('typing_stop', { receiverId });
          isTypingRef.current = false;
        }
      } else {
        console.error('[NewChatBox] Failed to send message');
      }
    } catch (error) {
      console.error('[NewChatBox] Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const success = await deleteMessage(messageId);
      if (success) {
        console.log('[NewChatBox] Message deleted successfully');
      } else {
        console.error('[NewChatBox] Failed to delete message');
      }
    } catch (error) {
      console.error('[NewChatBox] Error deleting message:', error);
    }
  };

  // Handle message editing
  const handleEditMessage = async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    try {
      const success = await editMessage(
        editingMessageId,
        editingContent.trim()
      );
      if (success) {
        console.log('[NewChatBox] Message edited successfully');
        setEditingMessageId(null);
        setEditingContent('');
      } else {
        console.error('[NewChatBox] Failed to edit message');
      }
    } catch (error) {
      console.error('[NewChatBox] Error editing message:', error);
    }
  };

  // Start editing
  const startEditing = (message: ChatMessage) => {
    setEditingMessageId(message._id);
    setEditingContent(message.message);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  // Handle input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setNewMessage(e.target.value);

    // Emit typing_start immediately when user starts typing
    if (!isTypingRef.current && socket && isConnected && receiverId) {
      isTypingRef.current = true;
      socket.emit('typing_start', { receiverId });
    }

    // Debounce typing_stop after 1s of inactivity
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      if (
        isTypingRef.current &&
        socket &&
        isConnected &&
        receiverId
      ) {
        socket.emit('typing_stop', { receiverId });
        isTypingRef.current = false;
      }
    }, 1000);
  };

  // Handle pressing Enter to send message
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format timestamp
  const formatMessageTime = (date: Date | string) => {
    const msgDate = new Date(date);

    if (isToday(msgDate)) {
      return format(msgDate, 'HH:mm');
    } else if (isYesterday(msgDate)) {
      return `Yesterday ${format(msgDate, 'HH:mm')}`;
    } else {
      return format(msgDate, 'MMM d, HH:mm');
    }
  };

  // Message component
  const MessageItem = ({
    message,
    isOwnMessage,
  }: {
    message: ChatMessage;
    isOwnMessage: boolean;
  }) => {
    const isEditing = editingMessageId === message._id;

    return (
      <div
        className={`flex gap-3 mb-4 ${
          isOwnMessage ? 'justify-end' : 'justify-start'
        }`}
      >
        {!isOwnMessage && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage
              src={message.sender.profilePic}
              alt={message.sender.name}
            />
            <AvatarFallback>
              {message.sender.name?.slice(0, 2) || 'U'}
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={`flex flex-col max-w-[70%] ${
            isOwnMessage ? 'items-end' : 'items-start'
          }`}
        >
          {/* Message bubble */}
          <div
            className={`group relative px-3 py-2 max-w-full break-words shadow-sm ${
              isOwnMessage
                ? 'bg-green-500 text-white rounded-lg rounded-br-sm'
                : 'bg-white text-gray-900 border border-gray-200 rounded-lg rounded-bl-sm'
            }`}
          >
            {isEditing ? (
              <div className="min-w-[200px]">
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="w-full bg-transparent border-none outline-none resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEditMessage();
                    } else if (e.key === 'Escape') {
                      cancelEditing();
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleEditMessage}
                    disabled={!editingContent.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm">{message.message}</p>

                {/* Message actions dropdown */}
                {isOwnMessage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`absolute -right-2 -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isOwnMessage
                            ? 'text-white hover:bg-white/20'
                            : 'text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {message.messageType === 'text' && (
                        <DropdownMenuItem
                          onClick={() => startEditing(message)}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() =>
                          handleDeleteMessage(message._id)
                        }
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>

          {/* Message timestamp and status */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">
              {formatMessageTime(message.createdAt)}
            </span>
            {message.editedAt && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
            {isOwnMessage && (
              <span className="text-xs text-gray-400">
                {message.isRead ? 'Read' : 'Delivered'}
              </span>
            )}
          </div>
        </div>

        {isOwnMessage && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage
              src={message.sender.profilePic}
              alt={message.sender.name}
            />
            <AvatarFallback>
              {message.sender.name?.slice(0, 2) || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">
            Connecting to chat server...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading conversation...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto bg-gray-50/50 px-4"
            style={{ height: 'calc(100vh - 300px)' }}
          >
            {conversationMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium mb-2">
                    No messages yet
                  </p>
                  <p className="text-gray-400 text-sm">
                    Start the conversation by sending a message!
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-4">
                {conversationMessages.map((message) => {
                  const isOwnMessage =
                    message.sender._id === user?.id;
                  return (
                    <MessageItem
                      key={message._id}
                      message={message}
                      isOwnMessage={isOwnMessage}
                    />
                  );
                })}
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          {/* Message input area */}
          <div className="border-t bg-white dark:bg-gray-800 p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="w-full border-0 bg-white rounded-3xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm placeholder:text-gray-400 text-sm max-h-[120px] overflow-hidden"
                  rows={1}
                  style={{
                    minHeight: '44px',
                    lineHeight: '20px',
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="absolute right-2 bottom-2 h-8 w-8 rounded-full bg-green-500 hover:bg-green-600 border-0 shadow-sm"
                >
                  {isSending ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NewChatBox;
