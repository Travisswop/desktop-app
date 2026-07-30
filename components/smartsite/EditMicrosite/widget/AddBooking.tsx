"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import { handleCreateWidget } from "@/actions/widget";
import { handleV5SmartSiteUpdate } from "@/actions/update";
import getSingleSmartsiteData from "@/actions/singleSmartsiteDataFetching";
import {
  SMARTSITE_MAX_TABS,
  buildDefaultSmartsiteTabs,
  buildFlatTemplateOrderForTabs,
  generateSmartsiteTabId,
  getSmartsiteTemplateItemKey,
  normalizeSmartsitePinnedOrder,
  type SmartsiteTab,
} from "@/lib/smartsite-template-order";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";

const CALENDAR_TAB_NAME = "Meet";

/**
 * The Calendar template IS a tab (like Feed): confirming creates the booking
 * widget AND a dedicated "Meet" tab holding it. Setup (Google connect +
 * availability) happens inline on the builder canvas afterwards.
 */
const AddBooking = ({ onCloseModal }: { onCloseModal: () => void }) => {
  const smartsite: any = useSmartSiteApiDataStore((state) => state);
  const [busy, setBusy] = useState(false);

  const addCalendarTab = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const token = Cookies.get("access-token") || "";

      const preRes = await getSingleSmartsiteData(smartsite._id, token);
      const preSite = preRes?.data;
      if (!preSite?._id) throw new Error("Could not load your SmartSite");
      const storedTabs: SmartsiteTab[] = Array.isArray(preSite.tabs)
        ? preSite.tabs
        : [];
      if (storedTabs.length >= SMARTSITE_MAX_TABS) {
        toast.error(
          `Your SmartSite already has ${SMARTSITE_MAX_TABS} tabs — delete one, then add Calendar.`,
        );
        return;
      }

      const created = await handleCreateWidget(
        {
          micrositeId: smartsite._id,
          widgetType: "booking",
          config: {
            title: "Book a call",
            durationsMinutes: [30],
            availability: [1, 2, 3, 4, 5].map((day) => ({
              day,
              start: "09:00",
              end: "17:00",
            })),
            timezone:
              Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            bufferMinutes: 10,
            minNoticeHours: 4,
            maxDaysAhead: 30,
            addMeetLink: true,
            collectNote: true,
            published: false,
          },
        },
        token,
      );
      if (created?.state !== "success") throw new Error(created?.message);

      // Re-fetch so the widget key uses its REAL index in info.widget.
      const res = await getSingleSmartsiteData(smartsite._id, token);
      const site = res?.data;
      const widgets: any[] = site?.info?.widget || [];
      const index = widgets.findIndex((w) => w?._id === created?.data?._id);
      const widgetKey = getSmartsiteTemplateItemKey(
        "widget",
        widgets[index >= 0 ? index : widgets.length - 1],
        index >= 0 ? index : widgets.length - 1,
      );

      const baseTabs: SmartsiteTab[] =
        storedTabs.length > 0
          ? storedTabs.map((tab) => ({
              ...tab,
              order: (tab.order ?? []).filter((key) => key !== widgetKey),
            }))
          : buildDefaultSmartsiteTabs(site).map((tab) => ({
              ...tab,
              order: tab.order.filter((key) => key !== widgetKey),
            }));

      const nextTabs: SmartsiteTab[] = [
        ...baseTabs,
        {
          id: generateSmartsiteTabId(),
          name: CALENDAR_TAB_NAME,
          order: [widgetKey],
          gated: false,
        },
      ];

      const pinnedOrder = normalizeSmartsitePinnedOrder(site);
      await handleV5SmartSiteUpdate(
        {
          _id: site._id,
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
      toast.success("Calendar tab added — connect Google to go live");
      onCloseModal();
    } catch (error) {
      console.error(error);
      toast.error("Could not add the Calendar tab");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <h1 className="text-lg font-semibold text-gray-950">Add Calendar</h1>
      <p className="max-w-[300px] text-center text-[15px] text-gray-500">
        Adds a “{CALENDAR_TAB_NAME}” tab where visitors book time on your
        Google Calendar. You’ll connect Google and set availability next.
      </p>
      <div className="mt-1 flex items-center gap-3">
        <PrimaryButton type="button" onClick={onCloseModal} className="px-6 font-medium">
          Cancel
        </PrimaryButton>
        <PrimaryButton
          onClick={addCalendarTab}
          className="bg-black px-6 font-medium text-white hover:bg-gray-800"
        >
          {busy ? <Loader className="animate-spin" size={20} /> : "Add tab"}
        </PrimaryButton>
      </div>
    </div>
  );
};

export default AddBooking;
