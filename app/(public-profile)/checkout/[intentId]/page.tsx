import QueryProvider from '@/components/provider/QueryProvider';
import type { Metadata } from 'next';
import CheckoutPaymentClient from './CheckoutPaymentClient';

const DEFAULT_CHECKOUT_ORIGIN = 'https://app.swopme.co';
const DEFAULT_SWOP_IOS_APP_ID = '1593201322';

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
}: {
  params: Promise<{ intentId: string }>;
}) {
  const { intentId } = await params;

  return (
    <QueryProvider>
      <CheckoutPaymentClient intentId={intentId} />
    </QueryProvider>
  );
}
