"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { handleCreateWidget } from "@/actions/widget";
import LeadFormBuilder, { type LeadFormBuilderConfig } from "@/components/smartsite/EditMicrosite/widget/LeadFormBuilder";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";

export default function AddLeadForm({ onCloseModal }: { onCloseModal: () => void }) {
  const smartsite: any = useSmartSiteApiDataStore((state) => state);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setToken(Cookies.get("access-token") || ""), []);

  const save = async (config: LeadFormBuilderConfig) => {
    setSaving(true);
    try {
      const result = await handleCreateWidget({ micrositeId: smartsite._id, widgetType: "leadForm", config }, token);
      if (result?.state !== "success") throw new Error(result?.message);
      toast.success("Form added");
      onCloseModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add form");
    } finally {
      setSaving(false);
    }
  };

  return <LeadFormBuilder saving={saving} onSave={save} />;
}
