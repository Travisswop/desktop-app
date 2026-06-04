import QueryProvider from '@/components/provider/QueryProvider';
import CheckoutPaymentClient from './CheckoutPaymentClient';

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
