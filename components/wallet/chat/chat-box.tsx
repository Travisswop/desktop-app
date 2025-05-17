'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  content: string;
  sent: Date;
  senderAddress: string;
}

interface ChatProps {
  client: {
    address: string;
  };
  conversation: {
    send: (message: string) => Promise<void>;
  };
  messageHistory: Message[];
}

export default function ChatBox({
  client,
  conversation,
  messageHistory,
}: ChatProps) {
  const [inputMessage, setInputMessage] = useState('');
  const lastMessageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageHistory]);

  const onSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      await conversation.send(inputMessage);
      setInputMessage('');
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent the default new line behavior
      onSendMessage(event as any); // Trigger form submit
    }
  };

  const MessageList = ({ messages }: { messages: Message[] }) => {
    const uniqueMessages = messages.filter(
      (v, i, a) => a.findIndex((t) => t.id === v.id) === i
    );

    return (
      <div className="px-4 md:px-8 h-full">
        {uniqueMessages.map((message, index) => (
          <div
            key={message.id}
            ref={
              index === uniqueMessages.length - 1
                ? lastMessageRef
                : null
            }
            className={`mb-4 ${
              message.senderAddress === client.address
                ? 'text-right'
                : 'text-left'
            }`}
          >
            <div
              className={`inline-block px-3 py-2 rounded-lg ${
                message.senderAddress === client.address
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {message.content}
            </div>
            <div className="text-xs mt-1 text-muted-foreground">
              {message.sent.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="pt-4 w-full overflow-x-hidden h-full">
      <MessageList messages={messageHistory} />
      <div className="absolute bottom-0 bg-white  py-4 w-full">
        <form onSubmit={onSendMessage} className="">
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
                <button type="submit">
                  <svg
                    viewBox="0 0 24 24"
                    height="24"
                    width="24"
                    preserveAspectRatio="xMidYMid meet"
                    version="1.1"
                    x="0px"
                    y="0px"
                    enableBackground="new 0 0 24 24"
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
