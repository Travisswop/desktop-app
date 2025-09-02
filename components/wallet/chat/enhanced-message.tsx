import React from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessage } from '@/lib/context/SocketChatContext';

interface EnhancedMessageProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  isGrouped?: boolean;
  isLastInGroup?: boolean;
}

export const EnhancedMessage: React.FC<EnhancedMessageProps> = ({
  message,
  isOwnMessage,
  isGrouped = false,
  isLastInGroup = true,
}) => {
  
  // Get display name - prioritize ENS name format
  const getDisplayName = () => {
    // If message has senderName and it looks like an ENS name, use it
    if (message.senderName && (message.senderName.includes('.') || !message.senderName.startsWith('User '))) {
      return message.senderName;
    }
    
    // Try to extract ENS from senderId if it contains ensName format
    if (message.senderId && message.senderId.includes('.')) {
      return message.senderId;
    }
    
    // Check if we have displayName or ensName fields
    if (message.displayName) {
      return message.displayName;
    }
    
    if (message.ensName) {
      return message.ensName;
    }
    
    // Fallback to formatted sender ID
    if (message.senderId?.startsWith('did:privy:')) {
      return `${message.senderId.substring(10, 16)}...`;
    } else if (message.senderId?.startsWith('0x')) {
      return `${message.senderId.substring(0, 6)}...${message.senderId.substring(message.senderId.length - 4)}`;
    }
    
    return 'Unknown User';
  };

  return (
    <div className={`flex gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 ${isOwnMessage ? 'flex-row-reverse' : ''} ${
      isGrouped ? 'pt-1 pb-1' : 'pt-3 pb-1'
    } px-3`}>
      {/* Avatar - only show for first message in group */}
      {!isGrouped ? (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.senderImage || '/default-avatar.png'} />
          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
            {getDisplayName().charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 h-8 flex-shrink-0" />
      )}

      <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'text-right' : ''}`}>
        {/* Message header - only show for first message in group */}
        {!isGrouped && (
          <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {getDisplayName()}
            </span>
          </div>
        )}

        {/* Message content */}
        <div className={`${
          isOwnMessage 
            ? 'bg-blue-500 text-white rounded-l-lg rounded-tr-lg' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-r-lg rounded-tl-lg'
        } px-3 py-2 text-sm shadow-sm ${isGrouped ? 'mb-1' : 'mb-2'}`}>
          <div className="break-words">
            {message.content}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center gap-2 text-xs opacity-90">
                  <span>📎</span>
                  <span>{attachment.filename || 'Attachment'}</span>
                  {attachment.size && <span>({Math.round(attachment.size / 1024)}KB)</span>}
                </div>
              ))}
            </div>
          )}

          {/* Legacy attachment support */}
          {message.attachment && !message.attachments?.length && (
            <div className="mt-2">
              {message.messageType === 'image' ? (
                <img src={message.attachment} alt="Attachment" className="max-w-xs rounded" />
              ) : (
                <div className="flex items-center gap-2 text-xs opacity-90">
                  <span>📎</span>
                  <a href={message.attachment} target="_blank" rel="noopener noreferrer" className="underline">
                    Attachment
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp - only show for last message in group */}
        {isLastInGroup && (
          <div className={`flex items-center gap-2 ${isOwnMessage ? 'justify-end' : ''}`}>
            <span className="text-xs text-gray-500">
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};