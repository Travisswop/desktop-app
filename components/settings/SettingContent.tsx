'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { TabsContent } from '@radix-ui/react-tabs';
import Settings from './users-setting';
import Subscriptions from './subscription-plan';

export default function SettingContent() {
  return (
    <div className="bg-white rounded-xl p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-4">Settings</h1>
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 mb-6 bg-white">
              <TabsTrigger
                value="profile"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none"
              >
                Parent Profile
              </TabsTrigger>
              <TabsTrigger
                value="subscriptions"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none"
              >
                Subscriptions
              </TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <Settings />
            </TabsContent>
            <TabsContent value="subscriptions">
              <Subscriptions />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
