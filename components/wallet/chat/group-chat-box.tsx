import React, {
  useState,
  useEffect,
  useRef,
  KeyboardEvent,
} from 'react';
import {
  Loader,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import {
  useNewSocketChat,
  GroupMessage,
} from '@/lib/context/NewSocketChatContext';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { format, isToday, isYesterday } from 'date-fns';

interface GroupChatBoxProps {
  groupId: string;
}

const GroupChatBox: React.FC<GroupChatBoxProps> = ({ groupId }) => {
  const { user } = usePrivy();
  const {
    groupMessages,
    sendGroupMessage,
    getGroupHistory,
    joinGroup,
    sendBotCommand,
    isConnected,
    isInGroupWithBots,
  } = useNewSocketChat();

  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get group messages
  const groupMessagesList = (groupMessages[groupId] || []).sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  console.log(`[GroupChatBox] Rendering for group: ${groupId}`);
  console.log(`[GroupChatBox] Messages count: ${groupMessagesList.length}`);
  console.log(`[GroupChatBox] Has bots: ${isInGroupWithBots}`);

  // Load group conversation when component mounts
  useEffect(() => {
    const loadGroupConversation = async () => {
      if (!user?.id || !groupId) return;

      setIsLoading(true);
      try {
        console.log(`[GroupChatBox] Loading group conversation: ${groupId}`);

        // First join the group
        const joinResult = await joinGroup(groupId);
        if (joinResult.success) {
          console.log(`[GroupChatBox] Successfully joined group`);
        } else {
          console.error(`[GroupChatBox] Failed to join group: ${joinResult.error}`);
        }

        // Then load group history
        const result = await getGroupHistory(groupId, 1, 50);
        if (result.success) {
          console.log(
            `[GroupChatBox] Loaded ${result.data.messages?.length || 0} group messages`
          );
        } else {
          console.error(`[GroupChatBox] Failed to load group history: ${result.error}`);
        }
      } catch (error) {
        console.error('[GroupChatBox] Error loading group conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isConnected) {
      loadGroupConversation();
    }
  }, [groupId, user?.id, isConnected, joinGroup, getGroupHistory]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessagesList]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [newMessage]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id || isSending) return;

    setIsSending(true);
    const messageContent = newMessage.trim();

    try {
      // Check if this is a bot command (starts with /)
      const isBotCommand = messageContent.startsWith('/') && isInGroupWithBots;

      if (isBotCommand) {
        // Handle bot command
        const parts = messageContent.split(' ');
        const command = parts[0].substring(1); // Remove the '/'
        const parameters = parts.slice(1).join(' ');

        console.log(`[GroupChatBox] Sending bot command: ${command} with params: ${parameters}`);

        const success = await sendBotCommand(command, parameters, groupId, 'sendai_bot');

        if (success) {
          console.log('[GroupChatBox] Bot command sent successfully');
          setNewMessage('');
        } else {
          console.error('[GroupChatBox] Failed to send bot command');
        }
      } else {
        // Regular group message
        const success = await sendGroupMessage(groupId, messageContent, 'text');

        if (success) {
          console.log('[GroupChatBox] Group message sent successfully');
          setNewMessage('');
        } else {
          console.error('[GroupChatBox] Failed to send group message');
        }
      }
    } catch (error) {
      console.error('[GroupChatBox] Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
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
    message: GroupMessage;
    isOwnMessage: boolean;
  }) => {
    const isBot = message.sender.isBot || false;

    return (
      <div
        className={`flex gap-2 mb-3 ${
          isOwnMessage ? 'justify-end' : 'justify-start'
        } px-4`}
      >
        {!isOwnMessage && (
          <Avatar className="h-8 w-8 flex-shrink-0 self-end">
            <AvatarImage
              src={message.sender.profilePic}
              alt={message.sender.name}
            />
            <AvatarFallback className={isBot ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'}>
              {isBot ? '🤖' : message.sender.name?.slice(0, 2) || 'U'}
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={`flex flex-col max-w-[80%] ${
            isOwnMessage ? 'items-end' : 'items-start'
          }`}
        >
          {/* Sender name for group messages (except own messages) */}
          {!isOwnMessage && (
            <div className="text-xs font-medium mb-1 px-1">
              <span className={isBot ? 'text-blue-600' : 'text-green-600'}>
                {isBot ? '🤖 ' : ''}{message.sender.name || message.sender.username || 'Unknown'}
              </span>
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`group relative px-3 py-2 max-w-full break-words shadow-sm ${
              isOwnMessage
                ? 'bg-green-500 text-white rounded-lg rounded-br-sm'
                : isBot
                ? 'bg-blue-50 text-blue-900 border border-blue-200 rounded-lg rounded-bl-sm'
                : 'bg-white text-gray-900 border border-gray-200 rounded-lg rounded-bl-sm'
            }`}
          >
            <p className="text-sm leading-relaxed">{message.message}</p>
            {/* Message timestamp inside bubble */}
            <div className={`text-xs mt-1 ${
              isOwnMessage ? 'text-green-100' : 'text-gray-500'
            } flex justify-end`}>
              {formatMessageTime(message.createdAt)}
              {message.editedAt && (
                <span className="ml-1">(edited)</span>
              )}
            </div>
          </div>

        </div>

      </div>
    );
  };

  // Bot command suggestions
  const BotCommandSuggestions = () => {
    if (!isInGroupWithBots || !newMessage.startsWith('/')) return null;

    const suggestions = [
      { command: '/price', description: 'Get cryptocurrency prices' },
      { command: '/balance', description: 'Check wallet balance' },
      { command: '/send', description: 'Send cryptocurrency' },
      { command: '/swap', description: 'Swap tokens' },
      { command: '/help', description: 'Get help with commands' },
    ];

    const filteredSuggestions = suggestions.filter(s =>
      s.command.toLowerCase().includes(newMessage.toLowerCase())
    );

    if (filteredSuggestions.length === 0) return null;

    return (
      <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mb-2 max-h-40 overflow-y-auto">
        {filteredSuggestions.map((suggestion) => (
          <div
            key={suggestion.command}
            onClick={() => setNewMessage(suggestion.command + ' ')}
            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
          >
            <div className="font-medium text-blue-600 text-sm">{suggestion.command}</div>
            <div className="text-xs text-gray-500 mt-0.5">{suggestion.description}</div>
          </div>
        ))}
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Connecting to chat server...</p>
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
            <p className="text-gray-600">Loading group conversation...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto bg-gray-50/50"
            style={{ height: 'calc(100vh - 300px)' }}
          >
            {groupMessagesList.length === 0 ? (
              <div className="flex items-center justify-center h-full px-4">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <p className="text-gray-600 font-medium mb-2">Welcome to the group!</p>
                  <p className="text-gray-500 text-sm mb-4">
                    Say hello to get the conversation started
                  </p>
                  {isInGroupWithBots && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
                      <p className="text-blue-700 text-sm font-medium mb-2">
                        🤖 Bot Commands Available:
                      </p>
                      <div className="text-blue-600 text-xs space-y-1">
                        <p>• /price [symbol] - Get crypto prices</p>
                        <p>• /balance - Check wallet balance</p>
                        <p>• /help - Show all commands</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-2">
                {groupMessagesList.map((message) => {
                  const isOwnMessage = message.sender._id === user?.id;
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
          <div className="border-t bg-gray-50/80 backdrop-blur-sm p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <BotCommandSuggestions />
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isInGroupWithBots
                      ? 'Message or /command...'
                      : 'Type a message...'
                  }
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
            {isInGroupWithBots && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setNewMessage('/price BTC')}
                  className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  💰 /price
                </button>
                <button
                  onClick={() => setNewMessage('/balance')}
                  className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors border border-green-200"
                >
                  💳 /balance
                </button>
                <button
                  onClick={() => setNewMessage('/help')}
                  className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                >
                  ❓ /help
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GroupChatBox;