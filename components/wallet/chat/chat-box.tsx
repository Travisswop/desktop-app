/*
 * ChatBox Component - Simplified XMTP Chat Interface
 *
 * This component provides a clean chat interface based on the MVP pattern.
 * It focuses on core XMTP messaging functionality without additional complexity.
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DecodedMessage } from '@xmtp/browser-sdk';
import { useXmtpContext } from '@/lib/context/XmtpContext';
import { AnyConversation } from '@/lib/context/XmtpContext';

interface ChatProps {
  conversation: AnyConversation;
  tokenData: any | null;
  recipientWalletData: Array<{
    address: string;
    isActive: boolean;
    isEVM: boolean;
  }>;
}

export default function ChatBox({
  conversation,
  tokenData,
  recipientWalletData,
}: ChatProps) {
  const { client, sendText, getMessages } = useXmtpContext();
  const [messages, setMessages] = useState<DecodedMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [recipientUserAddress, setRecipientUserAddress] = useState<string | null>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Extract peer address from conversation using simplified approach
  const extractPeerAddress = useMemo(() => {
    if (!conversation) return null;

    // For XMTP v3, try to get peer address from conversation
    const conv = conversation as any;

    // Try different ways to get peer address
    if (conv.peerAddress) return conv.peerAddress;
    if (conv.peer) return conv.peer;
    if (conv.topic) return conv.topic;

    // If all else fails, try to extract from members
    try {
      if (conv.members && Array.isArray(conv.members) && conv.members.length > 0) {
        const member = conv.members.find((m: any) => m.inboxId !== client?.inboxId);
        if (member?.accountAddresses && member.accountAddresses.length > 0) {
          return member.accountAddresses[0];
        }
      }
    } catch (error) {
      console.warn('⚠️ [ChatBox] Could not extract peer address from members:', error);
    }

    return null;
  }, [conversation, client?.inboxId]);

  // Set recipient address when peer address is extracted
  useEffect(() => {
    if (extractPeerAddress) {
      setRecipientUserAddress(extractPeerAddress);
      console.log('🎯 [ChatBox] Peer address extracted:', extractPeerAddress);
    }
  }, [extractPeerAddress]);

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!conversation) return;

      try {
        console.log('🔄 [ChatBox] Loading messages for conversation...');
        const conversationMessages = await getMessages(conversation);
        setMessages(conversationMessages);
        console.log('✅ [ChatBox] Messages loaded:', conversationMessages.length);
      } catch (error) {
        console.error('❌ [ChatBox] Error loading messages:', error);
      }
    };

    loadMessages();
  }, [conversation, getMessages]);

  // Stream new messages when conversation changes
  useEffect(() => {
    if (!conversation) return;

    let isMounted = true;
    let stream: any;

    const streamMessages = async () => {
      try {
        console.log('🎧 [ChatBox] Starting message stream...');
        // Use the stream() API for XMTP v3
        stream = await (conversation as any).stream();

        for await (const message of stream) {
          if (isMounted) {
            console.log('📨 [ChatBox] New message received:', message);
            setMessages((prevMessages) => {
              // Avoid duplicates by checking message ID
              const messageId = (message as any).id;
              const exists = prevMessages.some((m) => (m as any).id === messageId);
              if (!exists) {
                return [...prevMessages, message];
              }
              return prevMessages;
            });
          }
        }
      } catch (error) {
        console.error('❌ [ChatBox] Error streaming messages:', error);
      }
    };

    streamMessages();

    return () => {
      isMounted = false;
      if (stream) {
        try {
          stream.return();
        } catch (error) {
          console.warn('⚠️ [ChatBox] Error closing message stream:', error);
        }
      }
    };
  }, [conversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversation) return;

    console.log('📤 [ChatBox] Attempting to send message:', inputMessage);
    console.log('📤 [ChatBox] Conversation ID:', (conversation as any).id);
    console.log('📤 [ChatBox] Peer Address:', recipientUserAddress);

    try {
      console.log('🔄 [ChatBox] Calling sendText function...');
      await sendText(conversation, inputMessage);
      console.log('✅ [ChatBox] Message sent successfully');
      setInputMessage('');
    } catch (error: any) {
      console.error('❌ [ChatBox] Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message.',
        variant: 'destructive',
      });
    }
  };

  // Handle key press for sending messages
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  // Message list component
  const MessageList = ({ messages }: { messages: DecodedMessage[] }) => {
    const uniqueMessages = messages.filter(
      (v, i, a) => a.findIndex((t) => (t as any).id === (v as any).id) === i
    );

    // Filter and process messages to handle different content types
    const processedMessages = uniqueMessages.map(message => {
      const messageAny = message as any;
      const content = messageAny.content;
      const contentType = messageAny.contentType;

      // Handle different content types
      let displayContent: string;
      let shouldDisplay = true;

      try {
        if (typeof content === 'string') {
          // Simple text message
          displayContent = content;
        } else if (typeof content === 'object' && content !== null) {
          // Check if it's a system message or metadata change
          if (content.initiatedByInboxId || content.addedInboxes || content.removedInboxes || content.metadataFieldChanges) {
            // This is a system message - don't display it
            shouldDisplay = false;
            displayContent = '';
          } else {
            // Try to extract text from object or use fallback
            if (messageAny.fallback) {
              displayContent = messageAny.fallback;
            } else if (content.text) {
              displayContent = content.text;
            } else if (content.content) {
              displayContent = content.content;
            } else {
              // Unknown content type - use fallback or hide
              displayContent = messageAny.fallback || '[Unsupported message type]';
            }
          }
        } else {
          // Handle other content types using fallback
          displayContent = messageAny.fallback || '[Unsupported message type]';
        }
      } catch (error) {
        console.warn('Error processing message content:', error);
        displayContent = messageAny.fallback || '[Message could not be displayed]';
      }

      return {
        ...messageAny,
        displayContent,
        shouldDisplay
      };
    }).filter(msg => msg.shouldDisplay && msg.displayContent.trim());

    return (
      <div className="px-4 md:px-8 h-full pb-24">
        {processedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          processedMessages.map((message, index) => {
            const senderInboxId = message.senderInboxId;
            const sent = message.sent;
            const displayContent = message.displayContent;
            const id = message.id;

            // Check if this is our message
            const isOurMessage = senderInboxId === client?.inboxId;

            const formatTime = (date: Date | number | string) => {
              return new Date(date).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });
            };

            return (
              <div
                key={id || index}
                className={`flex mb-4 ${isOurMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${isOurMessage
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                    }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
                  <p
                    className={`text-xs mt-1 ${isOurMessage ? 'text-blue-200' : 'text-gray-500'
                      }`}
                  >
                    {formatTime(sent)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={lastMessageRef} />
      </div>
    );
  };

  return (
    <div className="pt-4 w-full overflow-x-hidden h-full">
      <MessageList messages={messages} />
      <div className="absolute bottom-0 bg-white py-4 w-full">
        <form onSubmit={handleSendMessage} className="">
          <div className="w-full px-4 md:px-8">
            <div className="flex justify-center items-center gap-2">
              <div className="flex-1 relative">
                <textarea
                  className="flex outline-none border border-gray-300 focus:border-gray-400 text-gray-700 text-md resize-none rounded-md pl-3 pr-20 pt-2 w-full"
                  value={inputMessage}
                  placeholder="Type your message here....."
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setInputMessage(e.target.value)}
                />
              </div>
              <div className="flex">
                <button type="submit" disabled={!inputMessage.trim()}>
                  <svg
                    viewBox="0 0 24 24"
                    height="24"
                    width="24"
                    preserveAspectRatio="xMidYMid meet"
                    version="1.1"
                    x="0px"
                    y="0px"
                    enableBackground="new 0 0 24 24"
                    className={inputMessage.trim() ? 'text-blue-600' : 'text-gray-400'}
                  >
                    <path
                      fill="currentColor"
                      d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
