"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Cookies from "js-cookie";

export default function ManageSubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [manageUrl, setManageUrl] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    if (window !== undefined) {
      const id = Cookies.get("user-id");
      if (id) {
        setUserId(id);
      }
    }
  }, []);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await axios.get(`/api/manage-subscription/${userId}`);

        console.log("res.data", res.data);

        setSubscription(res.data.subscription);
        setManageUrl(res.data.manageUrl);
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [userId]);

  const handleManage = () => {
    if (manageUrl) {
      window.location.href = manageUrl;
    }
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  if (!subscription) {
    return (
      <div className="text-center mt-10">
        <p>
          You are currently on a <strong>Free</strong> plan.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl mt-10 shadow text-center">
      <h2 className="text-2xl font-bold mb-4">Manage Subscription</h2>
      <p>
        <strong>Plan:</strong>{" "}
        {subscription.planNickname || subscription.status}
      </p>
      <p>
        <strong>Status:</strong> {subscription.status}
      </p>
      {subscription.currentPeriodEnd && (
        <p>
          <strong>Billing Ends:</strong>{" "}
          {format(new Date(subscription.currentPeriodEnd), "MMMM dd, yyyy")}
        </p>
      )}
      {manageUrl && (
        <Button className="mt-6" onClick={handleManage}>
          Manage on Stripe
        </Button>
      )}
    </div>
  );
}
