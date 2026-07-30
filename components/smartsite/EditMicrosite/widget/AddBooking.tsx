"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { handleCreateWidget } from "@/actions/widget";
import BookingConfigForm, {
  defaultBookingConfig,
  type BookingWidgetConfig,
} from "@/components/smartsite/EditMicrosite/widget/BookingConfigForm";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";

const AddBooking = ({ onCloseModal }: { onCloseModal: () => void }) => {
  const smartsite: any = useSmartSiteApiDataStore((state) => state);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => setToken(Cookies.get("access-token") || ""), []);

  const handleSave = async (config: BookingWidgetConfig) => {
    setIsLoading(true);
    try {
      const result = await handleCreateWidget(
        {
          micrositeId: smartsite._id,
          widgetType: "booking",
          config,
        },
        token,
      );
      if (result?.state !== "success") throw new Error(result?.message);
      toast.success("Book a Meeting added");
      onCloseModal();
    } catch (error) {
      console.error(error);
      toast.error("Could not add Book a Meeting");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BookingConfigForm
      initialConfig={defaultBookingConfig()}
      saveLabel="Save Meeting Template"
      saving={isLoading}
      onSave={handleSave}
    />
  );
};

export default AddBooking;
