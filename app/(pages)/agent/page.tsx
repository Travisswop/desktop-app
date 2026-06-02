import { redirect } from 'next/navigation';

export default function AgentPage() {
  redirect('/dashboard/chat?astro=1');
}
