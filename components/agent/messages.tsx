'use client';

import { Message } from 'ai';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { LoadingDots } from './loading-dots';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface MessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

export function Messages({ messages, isLoading }: MessagesProps) {
  return (
    <ScrollArea className="flex-1 h-full">
      <div className="flex-1 p-4 space-y-6 max-w-5xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-4 max-w-[85%] ${
              message.role === 'user'
                ? 'ml-auto flex-row-reverse'
                : ''
            }`}
          >
            <div className="flex-shrink-0">
              {message.role === 'user' ? (
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-500" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-500" />
                </div>
              )}
            </div>
            <div
              className={`flex flex-col space-y-1 ${
                message.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="text-sm text-gray-300">
                {message.role === 'user' ? 'You' : 'Astro'}
              </div>
              <div
                className={`rounded-2xl px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white rounded-tr-none'
                    : 'bg-[#363636] rounded-tl-none'
                }`}
              >
                <ReactMarkdown
                  className={`prose ${
                    message.role === 'user'
                      ? 'prose-invert'
                      : 'prose-invert'
                  } max-w-none`}
                  components={{
                    p: ({ node, ...props }) => (
                      <p className="m-0" {...props} />
                    ),
                    pre: ({ node, ...props }) => (
                      <pre
                        className="bg-[#2a2a2a] rounded-lg p-4 overflow-x-auto"
                        {...props}
                      />
                    ),
                    code: ({ node, ...props }) => (
                      <code
                        className="bg-[#404040] rounded px-1 py-0.5"
                        {...props}
                      />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-500" />
            </div>
            <div className="rounded-2xl px-4 py-2 bg-[#363636] rounded-tl-none">
              <LoadingDots />
            </div>
          </div>
        )}
      </div>
      <ScrollBar orientation="vertical" className="bg-transparent" />
    </ScrollArea>
  );
}
