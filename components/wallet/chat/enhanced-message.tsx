import React from 'react';
import { format } from 'date-fns';
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

  // Calculate bubble corner rounding for grouped messages (iPhone style)
  const getBubbleRadius = () => {
    if (!isGrouped && isLastInGroup) {
      // Single message - fully rounded
      return 'rounded-2xl';
    } else if (!isGrouped && !isLastInGroup) {
      // First in group
      return isOwnMessage ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md';
    } else if (isGrouped && !isLastInGroup) {
      // Middle of group
      return isOwnMessage ? 'rounded-l-2xl rounded-tr-2xl rounded-br-md' : 'rounded-r-2xl rounded-tl-2xl rounded-bl-md';
    } else {
      // Last in group
      return isOwnMessage ? 'rounded-l-2xl rounded-tr-2xl rounded-br-2xl' : 'rounded-r-2xl rounded-tl-2xl rounded-bl-2xl';
    }
  };

  return (
    <>
      {/* Timestamp - show for last message in group with some spacing */}
      {isLastInGroup && (
        <div className="flex justify-center mb-4 mt-6">
          <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            {format(new Date(message.createdAt), 'MMM d, h:mm a')}
          </div>
        </div>
      )}
      
      <div className={`flex px-4 ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
        isGrouped ? 'mb-0.5' : 'mb-1'
      }`}>
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%]`}>
          {/* Message bubble */}
          <div className={`${
            isOwnMessage 
              ? 'bg-[#007AFF] text-white' 
              : 'bg-gray-700 text-white'
          } ${getBubbleRadius()} px-4 py-2.5 text-[15px] leading-normal shadow-sm break-words`}>
            {message.content}

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
                  <img src={message.attachment} alt="Attachment" className="max-w-xs rounded-lg" />
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
        </div>
      </div>
    </>
  );
};