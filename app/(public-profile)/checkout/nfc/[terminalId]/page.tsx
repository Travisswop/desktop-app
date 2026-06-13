import Link from 'next/link';
import { redirect } from 'next/navigation';

type ResolveTerminalResponse = {
  success?: boolean;
  data?: {
    terminalId: string;
    intentId: string;
    checkoutUrl: string;
    status: string;
  };
  message?: string;
  error?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://app.apiswop.co';

async function resolveTerminal(terminalId: string) {
  const response = await fetch(
    `${API_URL}/api/v5/checkout-nfc-terminals/${encodeURIComponent(
      terminalId
    )}/resolve`,
    { cache: 'no-store' }
  );
  const body = (await response.json().catch(() => ({}))) as ResolveTerminalResponse;

  if (!response.ok || !body.data?.checkoutUrl) {
    return {
      checkoutUrl: '',
      message: body.message || body.error || 'No active checkout for this NFC chip.',
    };
  }

  return {
    checkoutUrl: body.data.checkoutUrl,
    message: '',
  };
}

export default async function NfcCheckoutTerminalPage({
  params,
}: {
  params: Promise<{ terminalId: string }>;
}) {
  const { terminalId } = await params;
  const resolved = await resolveTerminal(terminalId);

  if (resolved.checkoutUrl) {
    redirect(resolved.checkoutUrl);
  }

  return (
    <main className="min-h-screen bg-[#f7f7f9] px-4 py-6 text-[#101114] sm:px-6">
      <section className="mx-auto max-w-xl rounded-lg border border-[#e7e8ec] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
          Swop Pay NFC
        </p>
        <h1 className="mt-3 text-2xl font-semibold">No active checkout</h1>
        <p className="mt-2 text-sm leading-6 text-[#646b78]">
          {resolved.message}
        </p>
        <p className="mt-3 break-all font-mono text-xs text-[#737b8c]">
          {terminalId}
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#101114] px-4 text-sm font-semibold text-white"
        >
          Open Swop
        </Link>
      </section>
    </main>
  );
}
