import { Chat } from '@/components/agent/chat';
import { WalletPanel } from '@/components/agent/wallet';

export default function AgentPage() {
  return (
    <main className="flex h-screen bg-background">
      <Chat />
      <WalletPanel />
    </main>
  );
}
