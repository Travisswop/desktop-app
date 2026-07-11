"use client";
import React, { useEffect, useRef } from "react";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import Cookies from "js-cookie";
import { handleV5SmartSiteUpdate } from "@/actions/update";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";

/**
 * Selecting the Feed template adds it immediately — no Yes/No step. On a
 * tabbed site the builder's sync effect then creates and activates the
 * dedicated "Feed" tab; the feed is removed by deleting that tab (the
 * server-side cascade turns showFeed off).
 */
const AddFeed = ({ onCloseModal }: any) => {
  const stateSmartsiteData: any = useSmartSiteApiDataStore((state) => state);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return; // strict-mode double-invoke guard
    startedRef.current = true;

    const addFeed = async () => {
      if (stateSmartsiteData?.showFeed) {
        toast.success(
          "Feed is already on your SmartSite — delete its tab to remove it.",
        );
        onCloseModal();
        return;
      }
      try {
        const token = Cookies.get("access-token") || "";
        await handleV5SmartSiteUpdate(
          { _id: stateSmartsiteData._id, showFeed: true },
          token,
        );
        toast.success("Feed added to your SmartSite");
      } catch (error) {
        console.error(error);
        toast.error("Something Went Wrong!");
      } finally {
        onCloseModal();
      }
    };

    addFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <Loader className="animate-spin" size={24} />
      <p className="text-sm font-medium text-gray-600">Adding Feed…</p>
    </div>
  );
};

export default AddFeed;
