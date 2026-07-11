"use client";
import React, { useState } from "react";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import Cookies from "js-cookie";
import { handleV5SmartSiteUpdate } from "@/actions/update";
import getSingleSmartsiteData from "@/actions/singleSmartsiteDataFetching";
import {
  SMARTSITE_FEED_TAB_NAME,
  SMARTSITE_MAX_TABS,
  buildDefaultSmartsiteTabs,
  buildFlatTemplateOrderForTabs,
  generateSmartsiteTabId,
  normalizeSmartsitePinnedOrder,
  type SmartsiteTab,
} from "@/lib/smartsite-template-order";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";

/**
 * The Feed template IS a tab: confirming here creates the dedicated "Feed"
 * tab directly. On a legacy flat site this is the first-tab conversion —
 * "Home" inherits the whole existing layout, the feed gets its own tab.
 * Removal is deleting the tab (server cascade turns showFeed off); there is
 * no show/hide manage view.
 */
const AddFeed = ({ onCloseModal }: any) => {
  const stateSmartsiteData: any = useSmartSiteApiDataStore((state) => state);
  const [busy, setBusy] = useState(false);

  const addFeedTab = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const token = Cookies.get("access-token") || "";
      const res = await getSingleSmartsiteData(stateSmartsiteData._id, token);
      const site = res?.data;
      if (!site?._id) {
        throw new Error("Could not load your SmartSite");
      }

      const storedTabs: SmartsiteTab[] = Array.isArray(site.tabs)
        ? site.tabs
        : [];
      const existingFeedTab = storedTabs.find(
        (tab) => Array.isArray(tab?.order) && tab.order.includes("feed"),
      );

      if (existingFeedTab && site.showFeed) {
        toast.success(
          "Feed is already on your SmartSite — delete its Feed tab to remove it.",
        );
        onCloseModal();
        return;
      }

      let nextTabs: SmartsiteTab[];
      if (existingFeedTab) {
        // Tab survived an earlier toggle-off — reuse it, never duplicate.
        nextTabs = storedTabs;
      } else if (storedTabs.length === 0) {
        nextTabs = [
          ...buildDefaultSmartsiteTabs(site).map((tab) => ({
            ...tab,
            order: tab.order.filter((key) => key !== "feed"),
          })),
          {
            id: generateSmartsiteTabId(),
            name: SMARTSITE_FEED_TAB_NAME,
            order: ["feed"],
            gated: false,
          },
        ];
      } else {
        if (storedTabs.length >= SMARTSITE_MAX_TABS) {
          toast.error(
            `Your SmartSite already has ${SMARTSITE_MAX_TABS} tabs — delete one, then add the Feed tab.`,
          );
          return;
        }
        nextTabs = [
          ...storedTabs.map((tab) => ({
            ...tab,
            order: (tab.order ?? []).filter((key) => key !== "feed"),
          })),
          {
            id: generateSmartsiteTabId(),
            name: SMARTSITE_FEED_TAB_NAME,
            order: ["feed"],
            gated: false,
          },
        ];
      }

      const pinnedOrder = normalizeSmartsitePinnedOrder(site);
      await handleV5SmartSiteUpdate(
        {
          _id: site._id,
          showFeed: true,
          tabs: nextTabs,
          pinnedOrder,
          templateOrder: buildFlatTemplateOrderForTabs(
            site,
            nextTabs,
            pinnedOrder,
          ),
        },
        token,
      );
      toast.success("Feed tab added");
      onCloseModal();
    } catch (error) {
      console.error(error);
      toast.error("Something Went Wrong!");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <h1 className="text-lg font-semibold text-gray-950">Add Feed</h1>
      <p className="text-[15px] text-gray-500">
        Do you want to add a Feed tab?
      </p>
      <div className="flex items-center gap-3 mt-1">
        <PrimaryButton
          type="button"
          onClick={onCloseModal}
          className="font-medium px-6"
        >
          Cancel
        </PrimaryButton>
        <PrimaryButton
          onClick={addFeedTab}
          className="bg-black hover:bg-gray-800 text-white font-medium px-6"
        >
          {busy ? <Loader className="animate-spin" size={20} /> : "Yes"}
        </PrimaryButton>
      </div>
    </div>
  );
};

export default AddFeed;
