'use client';

import { useState } from 'react';

import Card from './shared/Card';
import ActiveOrders from './Orders';
import UserPositions from './Positions';
import HighVolumeMarkets from './Markets';

type TabId = 'positions' | 'orders' | 'markets';

interface Tab {
  id: TabId;
  label: string;
}

const tabs: Tab[] = [
  { id: 'positions', label: 'My Positions' },
  { id: 'orders', label: 'Open Orders' },
  { id: 'markets', label: 'Markets' },
];

export default function MarketTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('markets');

  return (
    <Card className="p-4">
      {/* Tab Navigation */}
      <div className="bg-gray-100 rounded-lg p-1 flex gap-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'positions' && <UserPositions />}
        {activeTab === 'orders' && <ActiveOrders />}
        {activeTab === 'markets' && <HighVolumeMarkets />}
      </div>
    </Card>
  );
}
