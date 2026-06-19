import QueryProvider from '@/components/provider/QueryProvider';
import type { Metadata } from 'next';
import CheckoutPaymentClient from './CheckoutPaymentClient';

const DEFAULT_CHECKOUT_ORIGIN = 'https://app.swopme.co';
const DEFAULT_SWOP_IOS_APP_ID = '1593201322';
type CheckoutScanMethod = 'swop' | 'phantom';
type CheckoutSearchParams = Record<string, string | string[] | undefined>;

function checkoutUrlForIntent(intentId: string) {
  const origin = (
    process.env.NEXT_PUBLIC_CHECKOUT_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_CHECKOUT_ORIGIN
  ).replace(/\/+$/, '');

  try {
    return new URL(`/checkout/${encodeURIComponent(intentId)}`, origin).toString();
  } catch {
    return `${DEFAULT_CHECKOUT_ORIGIN}/checkout/${encodeURIComponent(intentId)}`;
  }
}

function checkoutScanMethodFromSearchParams(
  searchParams: CheckoutSearchParams
): CheckoutScanMethod {
  const rawMethod = searchParams.method;
  const method = Array.isArray(rawMethod) ? rawMethod[0] : rawMethod;
  return method === 'phantom' ? 'phantom' : 'swop';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ intentId: string }>;
}): Promise<Metadata> {
  const { intentId } = await params;
  const checkoutUrl = checkoutUrlForIntent(intentId);
  const iosAppId = process.env.NEXT_PUBLIC_SWOP_IOS_APP_ID || DEFAULT_SWOP_IOS_APP_ID;

  return {
    title: 'Swop Pay Checkout',
    description: 'Review and sign this Swop Pay checkout.',
    alternates: {
      canonical: checkoutUrl,
    },
    other: {
      'apple-itunes-app': `app-id=${iosAppId}, app-argument=${checkoutUrl}`,
    },
  };
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ intentId: string }>;
  searchParams?: Promise<CheckoutSearchParams>;
}) {
  const { intentId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialScanMethod =
    checkoutScanMethodFromSearchParams(resolvedSearchParams);

  return (
    <QueryProvider>
      <CheckoutPaymentClient
        intentId={intentId}
        initialScanMethod={initialScanMethod}
      />
    </QueryProvider>
  );
}
