'use client';
import Link from 'next/link';
import React, { memo, useMemo } from 'react';
import DynamicPrimaryBtn from '../ui/Button/DynamicPrimaryBtn';
import AnimateButton from '../ui/Button/AnimateButton';
import { useSearchParams } from 'next/navigation';

// Cache the app URL to avoid reading from process.env on each render
const APP_URL = process.env.NEXT_PUBLIC_API_URL;

const TabSwitcher = memo(() => {
  const searchParams = useSearchParams();

  const tab = useMemo(
    () => searchParams?.get('tab') || '',
    [searchParams]
  );

  const tabs = useMemo(
    () => [
      {
        key: 'feed',
        label: 'Feed',
        width: 'w-28',
        href: `${APP_URL}?tab=feed`,
        isActive: tab === 'feed' || !tab,
      },
      {
        key: 'timeline',
        label: 'Timeline',
        width: 'w-28',
        href: `${APP_URL}?tab=timeline`,
        isActive: tab === 'timeline',
      },
      {
        key: 'transaction',
        label: 'Transaction',
        width: 'w-32',
        href: `${APP_URL}?tab=transaction`,
        isActive: tab === 'transaction',
      },
    ],
    [tab]
  );

  return (
    <div className="flex items-center gap-2">
      {tabs.map(({ key, label, width, href, isActive }) => (
        <Link key={key} href={href}>
          {isActive ? (
            <DynamicPrimaryBtn
              enableGradient={false}
              className={`!rounded ${width} hover:!bg-black`}
            >
              {label}
            </DynamicPrimaryBtn>
          ) : (
            <AnimateButton width={width} className="!rounded">
              {label}
            </AnimateButton>
          )}
        </Link>
      ))}
    </div>
  );
});

TabSwitcher.displayName = 'TabSwitcher';

export default TabSwitcher;
