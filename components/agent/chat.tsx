'use client';

import { Message } from 'ai';
import { useChat } from 'ai/react';
import { useRef, useState, ReactElement } from 'react';
import type { FormEvent } from 'react';

import {
  Coins,
  ArrowLeftRight,
  Square,
  ArrowUpIcon,
  Wallet,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Messages } from './messages';
import Image from 'next/image';

interface CustomMessage extends Message {
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

const API_ENDPOINT = '/api/chat';

export function Chat() {
  const { toast } = useToast();

  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  const [showIntermediateSteps, setShowIntermediateSteps] =
    useState(false);
  const [intermediateStepsLoading, setIntermediateStepsLoading] =
    useState(false);

  const [sourcesForMessages, setSourcesForMessages] = useState<
    Record<string, any>
  >({});

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading: chatEndpointIsLoading,
    setMessages,
  } = useChat({
    api: API_ENDPOINT,
    onResponse(response) {
      const sourcesHeader = response.headers.get('x-sources');
      const sources = sourcesHeader
        ? JSON.parse(
            Buffer.from(sourcesHeader, 'base64').toString('utf8')
          )
        : [];
      const messageIndexHeader =
        response.headers.get('x-message-index');
      if (sources.length && messageIndexHeader !== null) {
        setSourcesForMessages({
          ...sourcesForMessages,
          [messageIndexHeader]: sources,
        });
      }
    },
    streamProtocol: 'text',
    onError: (e) => {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: e.message,
      });
    },
  });

  // Add function to handle demo prompts
  const handleDemoPrompt = async (prompt: string) => {
    setInput(prompt);
    // Create a synthetic form event
    const syntheticEvent = {
      preventDefault: () => {},
    } as FormEvent<HTMLFormElement>;

    // Small delay to ensure input is set
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Call sendMessage directly
    await sendMessage(syntheticEvent);
  };

  // Demo prompts data
  const demoPrompts = [
    {
      icon: <ArrowLeftRight className="h-5 w-5 text-blue-500" />,
      text: 'Swap USDC to SWOP token',
      prompt: 'I want to swap 1 USDC...',
    },
    {
      icon: <Coins className="h-5 w-5 text-green-500" />,
      text: 'Send Token',
      prompt: 'I want to send 50 SWOP tokens to...',
    },
    {
      icon: <Wallet className="h-5 w-5 text-purple-500" />,
      text: 'Wallet Address',
      prompt: 'Show me my wallet address',
    },
  ];

  async function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (messageContainerRef.current) {
      messageContainerRef.current.classList.add('grow');
    }
    if (!messages.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (chatEndpointIsLoading ?? intermediateStepsLoading) {
      return;
    }
    if (!showIntermediateSteps) {
      handleSubmit(e);
      // Some extra work to show intermediate steps properly
    } else {
      setIntermediateStepsLoading(true);
      setInput('');
      const messagesWithUserReply = messages.concat({
        id: messages.length.toString(),
        content: input,
        role: 'user',
      });
      setMessages(messagesWithUserReply);
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
          messages: messagesWithUserReply,
          show_intermediate_steps: true,
        }),
      });
      const json = await response.json();
      setIntermediateStepsLoading(false);
      if (response.status === 200) {
        const responseMessages = json.messages as CustomMessage[];
        // Represent intermediate steps as system messages for display purposes
        // TODO: Add proper support for tool messages
        const toolCallMessages = responseMessages.filter(
          (responseMessage: CustomMessage) => {
            return (
              (responseMessage.role === 'assistant' &&
                !!responseMessage.tool_calls?.length) ||
              responseMessage.role === 'assistant'
            );
          }
        );
        const intermediateStepMessages = [];
        for (let i = 0; i < toolCallMessages.length; i += 2) {
          const aiMessage = toolCallMessages[i];
          const toolMessage = toolCallMessages[i + 1];
          intermediateStepMessages.push({
            id: (messagesWithUserReply.length + i / 2).toString(),
            role: 'system' as const,
            content: JSON.stringify({
              action: aiMessage.tool_calls?.[0],
              observation: toolMessage.content,
            }),
          });
        }
        const newMessages = messagesWithUserReply;
        for (const message of intermediateStepMessages) {
          newMessages.push(message);
          setMessages([...newMessages]);
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 + Math.random() * 1000)
          );
        }
        setMessages([
          ...newMessages,
          {
            id: newMessages.length.toString(),
            content:
              responseMessages[responseMessages.length - 1].content,
            role: 'assistant',
          },
        ]);
      } else {
        if (json.error) {
          toast({
            title: 'Error',
            description: json.error,
            variant: 'destructive',
          });
        }
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen  ">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="mb-1">
            {/* <AnimatedBot size="lg" color="#ec4899" /> pink-500 */}
            <div className="animate-float">
              <Image
                src="/astro-agent.png"
                alt="astronot image"
                width={120}
                height={120}
                priority
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1 ">
            Hi, I&apos;m Astro
          </h1>
          <p className="text-sm  mb-8">Your AI Trading Assistant</p>

          <div className="w-full max-w-2xl space-y-4">
            <p className="text-center text-sm  mb-4">
              Try these examples:
            </p>
            <div className="grid grid-cols-1 gap-2">
              {demoPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleDemoPrompt(prompt.prompt)}
                  className="w-full border border-[#333333] rounded-lg p-4 transition-all duration-200 flex items-center group text-left"
                >
                  <div className="w-10 h-10 rounded-full  flex items-center justify-center flex-shrink-0 transition-colors">
                    {prompt.icon}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-[15px] font-medium">
                      {prompt.text}
                    </h3>
                    <p className="text-sm mt-0.5 line-clamp-1">
                      {prompt.prompt}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <Messages
            messages={messages}
            isLoading={chatEndpointIsLoading}
          />
        </>
      )}
      <div className="border-t border-[#2a2a2a] bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto p-4">
          <form
            onSubmit={sendMessage}
            className="relative flex flex-col items-center"
          >
            <div className="relative w-full">
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !chatEndpointIsLoading) {
                      sendMessage(
                        e as unknown as FormEvent<HTMLFormElement>
                      );
                    }
                  }
                }}
                placeholder="Message Astro..."
                rows={2}
                className="w-full px-4 py-3 pr-12 bg-[#2a2a2a] border border-[#3a3a3a] hover:border-[#4a4a4a] focus:border-blue-500 rounded-xl text-white placeholder-gray-400 focus:outline-none resize-none overflow-hidden shadow-sm transition-colors"
                style={{
                  height: 'auto',
                  minHeight: '72px',
                  maxHeight: '300px',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(
                    target.scrollHeight,
                    300
                  )}px`;
                }}
              />
              <button
                type="submit"
                disabled={chatEndpointIsLoading || !input.trim()}
                className="absolute right-2 bottom-4 p-1.5 bg-white hover:bg-blue-600 disabled:bg-[#3a3a3a] disabled:opacity-50 rounded-full transition-colors disabled:cursor-not-allowed flex items-center justify-center"
              >
                <ArrowUpIcon className="w-4 h-4 text-black" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
