import React, { useState } from 'react';
import { format } from 'date-fns';
import { MessageCircle, Heart, Edit, Trash2, Forward, Pin, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessage, useSocketChat } from '@/lib/context/SocketChatContext';
import { usePrivy } from '@privy-io/react-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EnhancedMessageProps {
  message: ChatMessage;
  conversationId: string;
  isOwnMessage: boolean;
}

export const EnhancedMessage: React.FC<EnhancedMessageProps> = ({
  message,
  conversationId,
  isOwnMessage,
}) => {
  const { user } = usePrivy();
  const { addReaction, removeReaction, editMessage, deleteMessage, forwardMessage, replyToMessage } = useSocketChat();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  
  const handleReaction = async (emoji: string) => {
    try {
      // Check if user already reacted with this emoji
      const existingReaction = message.reactions?.find(r => r.userId === user?.id && r.emoji === emoji);
      
      if (existingReaction) {
        await removeReaction(message._id, conversationId);
      } else {
        await addReaction(message._id, emoji, conversationId);
      }
    } catch (error) {
      console.error('Failed to handle reaction:', error);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    
    try {
      await editMessage(message._id, editContent, conversationId);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDelete = async (deleteFor: 'me' | 'everyone' = 'me') => {
    try {
      await deleteMessage(message._id, conversationId, deleteFor);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleForward = async () => {
    // In a real implementation, this would open a recipient selector
    console.log('Forward message:', message._id);
  };

  const handleReply = async () => {
    // In a real implementation, this would set the reply context
    console.log('Reply to message:', message._id);
  };

  // Enhanced message status display
  const getMessageStatus = () => {
    if (message.status) {
      switch (message.status) {
        case 'sending': return '⏳';
        case 'sent': return '✓';
        case 'delivered': return '✓✓';
        case 'read': return '✓✓ (read)';
        case 'failed': return '❌';
        default: return '';
      }
    }
    return '';
  };

  // Show forwarded message header
  const isForwarded = message.forwardedFrom;

  // Show reply context
  const isReply = message.parentMessageId;

  // Show edited indicator
  const isEdited = message.isEdited || message.edited;

  return (
    <div className={`flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={message.senderImage} />
        <AvatarFallback>
          {message.senderName?.charAt(0) || message.senderId.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className={`flex-1 max-w-md ${isOwnMessage ? 'text-right' : ''}`}>
        {/* Forwarded indicator */}
        {isForwarded && (
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Forward className="w-3 h-3" />
            Forwarded
          </div>
        )}

        {/* Reply context */}
        {isReply && (
          <div className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded mb-2 border-l-4 border-blue-500">
            Replying to a message
          </div>
        )}

        {/* Message header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {message.senderName || `User ${message.senderId.slice(0, 6)}...`}
          </span>
          <span className="text-xs text-gray-500">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {message.isPinned && <Pin className="w-3 h-3 text-blue-500" />}
          {isEdited && <span className="text-xs text-gray-500">(edited)</span>}
        </div>

        {/* Message content */}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 px-2 py-1 border rounded text-sm"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleEdit()}
            />
            <Button size="sm" onClick={handleEdit}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="text-sm mb-2">
            {/* Enhanced content with mentions, hashtags, links */}
            <div>
              {message.content}
              {message.mentions && message.mentions.length > 0 && (
                <div className="text-xs text-blue-600 mt-1">
                  Mentions: {message.mentions.map(m => `@${m.displayName}`).join(', ')}
                </div>
              )}
              {message.hashtags && message.hashtags.length > 0 && (
                <div className="text-xs text-blue-600 mt-1">
                  #{message.hashtags.join(' #')}
                </div>
              )}
            </div>

            {/* Enhanced attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2">
                {message.attachments.map((attachment, index) => (
                  <div key={index} className="border rounded p-2 text-xs">
                    <div>📎 {attachment.filename || 'Attachment'}</div>
                    {attachment.size && <div>Size: {Math.round(attachment.size / 1024)}KB</div>}
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
                  <a href={message.attachment} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    📎 Attachment
                  </a>
                )}
              </div>
            )}

            {/* Link previews */}
            {message.links && message.links.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.links.map((link, index) => (
                  <div key={index} className="border rounded p-2 bg-gray-50 dark:bg-gray-700">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {link.title || link.domain}
                    </a>
                    {link.description && <p className="text-xs text-gray-600 mt-1">{link.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enhanced reactions */}
        <div className="flex items-center gap-2 mt-2">
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1">
              {/* Group reactions by emoji */}
              {Object.entries(
                message.reactions.reduce((acc, reaction) => {
                  if (!acc[reaction.emoji]) acc[reaction.emoji] = [];
                  acc[reaction.emoji].push(reaction);
                  return acc;
                }, {} as Record<string, typeof message.reactions>)
              ).map(([emoji, reactions]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`px-2 py-1 rounded-full text-xs border ${
                    reactions.some(r => r.userId === user?.id)
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {emoji} {reactions.length}
                </button>
              ))}
            </div>
          )}

          {/* Quick reaction buttons */}
          <div className="flex gap-1">
            {['❤️', '👍', '😊', '😂'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-xs hover:bg-gray-100 p-1 rounded"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Message actions */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReply}
              className="h-6 px-2 text-xs"
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              Reply
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Message status */}
            <span className="text-xs text-gray-500">{getMessageStatus()}</span>

            {/* Message menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleForward}>
                  <Forward className="w-3 h-3 mr-2" />
                  Forward
                </DropdownMenuItem>
                {isOwnMessage && (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="w-3 h-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete('me')}>
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete for me
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete('everyone')}>
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete for everyone
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Read receipts */}
        {message.readReceipts && message.readReceipts.length > 0 && isOwnMessage && (
          <div className="text-xs text-gray-500 mt-1">
            Read by {message.readReceipts.length} recipient{message.readReceipts.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};