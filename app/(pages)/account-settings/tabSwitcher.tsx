"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
// import Settings from "./users-setting";
import SubscriptionPlans from "./subscriptionPlan";
import UpdateProfile from "./mainContent";

export default function UserAccountTabSwitcher({ data, accessToken }: any) {
  // State to control the active tab
  const [activeTab, setActiveTab] = useState("profile");

  // Function to switch tabs programmatically
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="bg-white rounded-xl p-14">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-4">Settings</h1>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
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
              {/* Pass the handleTabChange function to UpdateProfile */}
              <UpdateProfile
                data={data}
                token={accessToken}
                switchToTab={handleTabChange}
              />
            </TabsContent>
            <TabsContent value="subscriptions">
              <SubscriptionPlans />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
