"use client";

import { FC, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Loader } from "lucide-react";
import { handleLeadFormSubmit } from "@/actions/leadForm";

export type LeadFormFieldKey = "email" | "mobileNo" | "jobTitle" | "website";

export interface LeadFormConfig {
  title?: string;
  description?: string;
  buttonText?: string;
  successMessage?: string;
  fields?: LeadFormFieldKey[];
}

export const LEAD_FORM_FIELD_ORDER: LeadFormFieldKey[] = [
  "email",
  "mobileNo",
  "jobTitle",
  "website",
];

export const LEAD_FORM_FIELD_META: Record<
  LeadFormFieldKey,
  { label: string; placeholder: string; type: string }
> = {
  email: { label: "Email", placeholder: "john@example.com", type: "email" },
  mobileNo: { label: "Phone", placeholder: "+1 555 000 0000", type: "tel" },
  jobTitle: {
    label: "Job title",
    placeholder: "Software Engineer",
    type: "text",
  },
  website: { label: "Website", placeholder: "www.example.com", type: "text" },
};

interface Props {
  widgetId?: string;
  config: LeadFormConfig;
  /**
   * builder: inert preview — inputs disabled, clicks bubble up to open the
   * edit modal. public: the form is live and posts to the public
   * /api/v1/web/subscribe endpoint.
   */
  mode: "builder" | "public";
  micrositeId?: string;
  parentId?: string;
}

const inputClass =
  "w-full rounded-xl border border-black/[0.06] bg-gray-50 px-3 py-2 text-[13px] font-medium text-gray-950 outline-none placeholder:text-gray-400 focus:border-black/[0.2] disabled:cursor-default";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LeadFormCard: FC<Props> = ({
  widgetId,
  config,
  mode,
  micrositeId,
  parentId,
}) => {
  const isPublic = mode === "public";

  const fields = useMemo(
    () =>
      LEAD_FORM_FIELD_ORDER.filter((key) =>
        Array.isArray(config?.fields) ? config.fields.includes(key) : false,
      ),
    [config?.fields],
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isPublic || status !== "idle") return;

    const name = (values.name || "").trim();
    if (name.length < 3) {
      setErrorMessage("Enter your name (at least 3 characters)");
      return;
    }

    const email = (values.email || "").trim();
    if (fields.includes("email") && email && !EMAIL_REGEX.test(email)) {
      setErrorMessage("Enter a valid email address");
      return;
    }

    if (!parentId || !micrositeId) {
      setErrorMessage("This form isn't set up yet");
      return;
    }

    setErrorMessage("");
    setStatus("submitting");
    try {
      const payload: Record<string, string> = {
        parentId,
        micrositeId,
        name,
        source: `form:${widgetId || ""}`,
      };
      for (const key of fields) {
        const value = (values[key] || "").trim();
        if (value) payload[key] = value;
      }

      const result = await handleLeadFormSubmit(payload as any);
      if (result?.state === "success") {
        setStatus("success");
      } else {
        setStatus("idle");
        setErrorMessage(result?.message || "Something went wrong");
      }
    } catch (error) {
      console.error(error);
      setStatus("idle");
      setErrorMessage("Something went wrong");
    }
  };

  return (
    <div className="w-full my-2 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <ClipboardList size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight text-gray-950">
            {config?.title || "Leads Form"}
          </p>
          {config?.description && (
            <p className="truncate text-[13px] text-gray-500">
              {config.description}
            </p>
          )}
        </div>
      </div>

      {status === "success" ? (
        <div className="mt-4 flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle2 size={28} className="text-emerald-600" />
          <p className="text-[14px] font-semibold text-gray-950">
            {config?.successMessage || "Thanks!"}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
          <input
            type="text"
            value={values.name || ""}
            disabled={!isPublic || status !== "idle"}
            onClick={(event) => isPublic && event.stopPropagation()}
            onChange={(event) => setValue("name", event.target.value)}
            placeholder="Name"
            aria-label="Name"
            className={inputClass}
          />
          {fields.map((key) => {
            const meta = LEAD_FORM_FIELD_META[key];
            return (
              <input
                key={key}
                type={meta.type}
                value={values[key] || ""}
                disabled={!isPublic || status !== "idle"}
                onClick={(event) => isPublic && event.stopPropagation()}
                onChange={(event) => setValue(key, event.target.value)}
                placeholder={meta.label}
                aria-label={meta.label}
                className={inputClass}
              />
            );
          })}

          {isPublic ? (
            <>
              <button
                type="submit"
                disabled={status !== "idle"}
                onClick={(event) => event.stopPropagation()}
                className={`mt-1 w-full rounded-full py-2.5 text-[13px] font-semibold transition ${
                  status === "idle"
                    ? "bg-gray-950 text-white hover:bg-gray-800"
                    : "cursor-not-allowed bg-black/[0.04] text-gray-400"
                }`}
              >
                {status === "submitting" ? (
                  <Loader className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  config?.buttonText || "Submit"
                )}
              </button>
              {errorMessage && (
                <p className="text-center text-[11px] font-medium text-red-500">
                  {errorMessage}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="mt-1 w-full rounded-full bg-gray-950 py-2.5 text-center text-[13px] font-semibold text-white">
                {config?.buttonText || "Submit"}
              </div>
              <p className="text-center text-[11px] text-gray-400">
                Preview — visitors can submit this form on your page
              </p>
            </>
          )}
        </form>
      )}
    </div>
  );
};

export default LeadFormCard;
