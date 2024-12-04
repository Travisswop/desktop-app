"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
// import Settings from "./users-setting";
import SubscriptionPlans from "./subscriptionPlan";
import UpdateProfile from "./mainContent";
import { useSearchParams } from "next/navigation";

export default function UserAccountTabSwitcher({ data, token }: any) {
  const searchParams = useSearchParams();
  // State to control the active tab
  const [activeTab, setActiveTab] = useState("profile");

  // Function to switch tabs programmatically
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const isUpgrade = searchParams.get("upgrade");
  // console.log("isup date", isUpgrade);

  useEffect(() => {
    if (isUpgrade) {
      setActiveTab("subscriptions");
    }
  }, [isUpgrade]);

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
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none pl-0"
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
                token={token}
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
