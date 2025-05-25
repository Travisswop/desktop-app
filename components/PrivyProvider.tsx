'use client';

import { PrivyProvider as Privy } from '@privy-io/react-auth';

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const privyId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  return <Privy appId={privyId as string}>{children}</Privy>;
}
