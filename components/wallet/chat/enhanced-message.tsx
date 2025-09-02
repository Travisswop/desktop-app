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

  return (
    <div className={`flex mb-1 px-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {/* Timestamp - only show for last message in group */}
        {isLastInGroup && (
          <div className="text-xs text-gray-500 text-center w-full mb-2 mt-2">
            {format(new Date(message.createdAt), 'MMM d, h:mm a')}
          </div>
        )}

        {/* Message bubble */}
        <div className={`${
          isOwnMessage 
            ? 'bg-[#007AFF] text-white' 
            : 'bg-gray-700 text-white'
        } rounded-2xl px-4 py-2 text-base leading-relaxed shadow-sm ${
          isGrouped ? 'mb-1' : 'mb-2'
        } break-words`}>
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
  );
};