"use client";
import React, { useEffect, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { handleDeleteWidget, handleUpdateWidget } from "@/actions/widget";
import {
  LEAD_FORM_FIELD_ORDER,
  LEAD_FORM_FIELD_META,
  LeadFormFieldKey,
} from "@/components/publicProfile/widgets/LeadFormCard";

const CURRENCIES = ["USDC", "SOL", "pUSD"] as const;
const MAX_PRESETS = 6;

const WIDGET_TITLES: Record<string, string> = {
  tipJar: "Tip Jar",
  leadForm: "Leads Form",
};

const inputClass =
  "w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100";

/**
 * Edit/delete modal for smartsite widgets (tipJar / leadForm). Opened from
 * the builder preview via categoryForTrigger "widget" — follows the same
 * self-rendered overlay pattern as the other Update* components.
 */
const UpdateWidget = ({ iconDataObj, isOn, setOff }: any) => {
  const router = useRouter();
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(Cookies.get("access-token") || "");
  }, []);

  const widget = iconDataObj?.data || {};
  const widgetType: string = widget.widgetType || "";
  const config = widget.config || {};

  // tipJar fields
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [presetsInput, setPresetsInput] = useState("");
  const [allowCustom, setAllowCustom] = useState(true);
  const [currency, setCurrency] = useState<string>("USDC");

  // leadForm fields
  const [description, setDescription] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [leadFields, setLeadFields] = useState<
    Record<LeadFormFieldKey, boolean>
  >({
    email: false,
    mobileNo: false,
    jobTitle: false,
    website: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(config.title || "");
    setNote(config.note || "");
    setButtonText(config.buttonText || "");
    setPresetsInput(
      Array.isArray(config.presets) ? config.presets.join(", ") : "",
    );
    setAllowCustom(config.allowCustom !== false);
    setCurrency(config.currency || "USDC");
    setDescription(config.description || "");
    setSuccessMessage(config.successMessage || "");
    setLeadFields({
      email: Array.isArray(config.fields) && config.fields.includes("email"),
      mobileNo:
        Array.isArray(config.fields) && config.fields.includes("mobileNo"),
      jobTitle:
        Array.isArray(config.fields) && config.fields.includes("jobTitle"),
      website:
        Array.isArray(config.fields) && config.fields.includes("website"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget._id]);

  const closeModal = () => {
    setOff();
  };

  const handleBackdropClick = (e: any) => {
    if (
      modalRef.current &&
      !modalRef.current.contains(e.target) &&
      !isLoading &&
      !isDeleteLoading
    ) {
      closeModal();
    }
  };

  const buildConfig = (): Record<string, any> | null => {
    if (widgetType === "tipJar") {
      const presets = presetsInput
        .split(/[,\s]+/)
        .map((value: string) => Number(value))
        .filter((value: number) => Number.isFinite(value) && value > 0)
        .slice(0, MAX_PRESETS);
      if (presets.length === 0) {
        toast.error("Add at least one preset amount");
        return null;
      }
      return {
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        buttonText: buttonText.trim() || undefined,
        presets,
        allowCustom,
        currency,
      };
    }

    if (widgetType === "leadForm") {
      return {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        buttonText: buttonText.trim() || undefined,
        successMessage: successMessage.trim() || undefined,
        fields: LEAD_FORM_FIELD_ORDER.filter((key) => leadFields[key]),
      };
    }

    return null;
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    const nextConfig = buildConfig();
    if (!nextConfig) return;

    setIsLoading(true);
    try {
      const data = await handleUpdateWidget(
        {
          _id: widget._id,
          micrositeId: widget.micrositeId || iconDataObj?.micrositeId,
          config: nextConfig,
        },
        token,
      );

      if (data?.state === "success") {
        toast.success("Widget updated");
        closeModal();
        router.refresh();
      } else {
        toast.error("Something went wrong");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    try {
      const data = await handleDeleteWidget(
        {
          _id: widget._id,
          micrositeId: widget.micrositeId || iconDataObj?.micrositeId,
        },
        token,
      );

      if (data?.state === "success") {
        toast.success("Widget deleted");
        closeModal();
        router.refresh();
      } else {
        toast.error("Something went wrong");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  if (!isOn) {
    return null;
  }

  return (
    <div
      className="fixed z-50 left-0 top-0 h-full w-full overflow-auto flex items-center justify-center bg-overlay/50 backdrop"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="modal-content h-max w-96 lg:w-[32rem] bg-white relative rounded-xl"
      >
        <button
          className="btn btn-sm btn-circle absolute right-4 top-[12px]"
          onClick={closeModal}
        >
          <FaTimes color="gray" />
        </button>
        <div className="bg-white rounded-xl shadow-small p-6 flex flex-col gap-4 px-8">
          <h2 className="font-semibold text-gray-700 text-xl text-center">
            {WIDGET_TITLES[widgetType] || "Widget"}
          </h2>

          <form onSubmit={handleSave} className="flex flex-col gap-3">
            {widgetType === "tipJar" && (
              <>
                <div>
                  <p className="font-medium mb-1">Title</p>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClass}
                    placeholder="Tip Jar"
                  />
                </div>
                <div>
                  <p className="font-medium mb-1">Note</p>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className={inputClass}
                    placeholder="Support my work"
                  />
                </div>
                <div>
                  <p className="font-medium mb-1">Button Text</p>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className={inputClass}
                    placeholder="Send a tip"
                  />
                </div>
                <div>
                  <p className="font-medium mb-1">Preset Amounts</p>
                  <input
                    type="text"
                    value={presetsInput}
                    onChange={(e) => setPresetsInput(e.target.value)}
                    className={inputClass}
                    placeholder="1, 5, 10"
                    required
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={allowCustom}
                      onChange={(e) => setAllowCustom(e.target.checked)}
                      className="h-4 w-4 accent-black"
                    />
                    Allow custom amount
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="border border-[#ede8e8] rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-100 focus:outline-none"
                  >
                    {CURRENCIES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {widgetType === "leadForm" && (
              <>
                <div>
                  <p className="font-medium mb-1">Title</p>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClass}
                    placeholder="Leads Form"
                  />
                </div>
                <div>
                  <p className="font-medium mb-1">Description</p>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={inputClass}
                    placeholder="Get in touch with me"
                  />
                </div>
                <div>
                  <p className="font-medium mb-1">Button Text</p>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className={inputClass}
                    placeholder="Submit"
                  />
                </div>
                <div>
                  <p className="font-medium mb-1">Success Message</p>
                  <input
                    type="text"
                    value={successMessage}
                    onChange={(e) => setSuccessMessage(e.target.value)}
                    className={inputClass}
                    placeholder="Thanks!"
                  />
                </div>
                <div>
                  <p className="font-medium mb-1">
                    Ask For{" "}
                    <span className="text-xs font-normal text-gray-400">
                      (name is always collected)
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {LEAD_FORM_FIELD_ORDER.map((key) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 font-medium"
                      >
                        <input
                          type="checkbox"
                          checked={leadFields[key]}
                          onChange={() =>
                            setLeadFields((prev) => ({
                              ...prev,
                              [key]: !prev[key],
                            }))
                          }
                          className="h-4 w-4 accent-black"
                        />
                        {LEAD_FORM_FIELD_META[key].label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <PrimaryButton className="w-full py-3">
              {isLoading ? (
                <Loader className="w-8 h-8 animate-spin mx-auto" />
              ) : (
                "Save Changes"
              )}
            </PrimaryButton>
          </form>

          <div className="flex justify-center">
            <AnimateButton
              whiteLoading={true}
              type="button"
              onClick={handleDelete}
              isLoading={isDeleteLoading}
              width={"w-32"}
              className="bg-black text-white py-2 !border-0"
            >
              <MdDelete size={20} /> Delete
            </AnimateButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateWidget;
