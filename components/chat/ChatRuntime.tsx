'use client';

import ChatContainer from '@/components/chat/ChatContainer';
import { PolymarketProviders } from '@/providers/polymarket';

interface ChatRuntimeProps {
  socket: any;
  currentUser: string;
  setUnreadCount: (count: number) => void;
  initialGroupId?: string | null;
  initialAstro?: boolean;
  initialAgentId?: string | null;
  initialDirectRecipient?: {
    userId?: string | null;
    micrositeId?: string | null;
    ens?: string | null;
  } | null;
}

export default function ChatRuntime({
  socket,
  currentUser,
  setUnreadCount,
  initialGroupId,
  initialAstro,
  initialAgentId,
  initialDirectRecipient,
}: ChatRuntimeProps) {
  return (
    <PolymarketProviders>
      <ChatContainer
        socket={socket}
        currentUser={currentUser}
        setUnreadCount={setUnreadCount}
        initialGroupId={initialGroupId}
        initialAstro={initialAstro}
        initialAgentId={initialAgentId}
        initialDirectRecipient={initialDirectRecipient}
      />
    </PolymarketProviders>
  );
}
