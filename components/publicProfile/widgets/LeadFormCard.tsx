"use client";

import { FC, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Loader } from "lucide-react";
import { handleLeadFormSubmit } from "@/actions/leadForm";

export type LeadFormFieldType =
  | "shortText"
  | "longText"
  | "choice"
  | "checkboxes"
  | "dropdown"
  | "date";

export interface LeadFormField {
  id: string;
  type: LeadFormFieldType;
  label: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  systemKey?: "name" | "email" | "mobileNo" | "jobTitle" | "website";
}

export type LegacyLeadFormFieldKey = "email" | "mobileNo" | "jobTitle" | "website";
export type LeadFormFieldKey = LegacyLeadFormFieldKey;
export const LEAD_FORM_FIELD_ORDER: LeadFormFieldKey[] = ["email", "mobileNo", "jobTitle", "website"];
export const LEAD_FORM_FIELD_META: Record<LeadFormFieldKey, { label: string; placeholder: string; type: string }> = {
  email: { label: "Email", placeholder: "you@email.com", type: "email" },
  mobileNo: { label: "Phone", placeholder: "+1 555 000 0000", type: "tel" },
  jobTitle: { label: "Job title", placeholder: "Software Engineer", type: "text" },
  website: { label: "Website", placeholder: "www.example.com", type: "text" },
};

export interface LeadFormConfig {
  title?: string;
  description?: string;
  buttonText?: string;
  successMessage?: string;
  fields?: Array<LeadFormField | LegacyLeadFormFieldKey>;
}

export const LEAD_FORM_FIELD_TYPE_META: Record<
  LeadFormFieldType,
  { label: string; defaultLabel: string; placeholder?: string; options?: string[] }
> = {
  shortText: { label: "Short text", defaultLabel: "Short answer", placeholder: "Type your answer" },
  longText: { label: "Long text", defaultLabel: "Message", placeholder: "A few words…" },
  choice: { label: "Choice", defaultLabel: "Choose one", options: ["Option 1", "Option 2"] },
  checkboxes: { label: "Checkboxes", defaultLabel: "Select all that apply", options: ["Option 1", "Option 2"] },
  dropdown: { label: "Dropdown", defaultLabel: "Choose an option", options: ["Option 1", "Option 2"] },
  date: { label: "Date", defaultLabel: "Date" },
};

export const DEFAULT_LEAD_FORM_FIELDS: LeadFormField[] = [
  { id: "name", type: "shortText", label: "Name", placeholder: "Your name", required: true, systemKey: "name" },
  { id: "email", type: "shortText", label: "Email", placeholder: "you@email.com", required: true, systemKey: "email" },
  {
    id: "interest",
    type: "choice",
    label: "I’m interested in",
    options: ["Partnership", "Sponsorship", "Something else"],
  },
  { id: "message", type: "longText", label: "Message", placeholder: "A few words…" },
];

const legacyMeta: Record<LegacyLeadFormFieldKey, Omit<LeadFormField, "id">> = {
  email: { type: "shortText", label: "Email", placeholder: "you@email.com", systemKey: "email" },
  mobileNo: { type: "shortText", label: "Phone", placeholder: "+1 555 000 0000", systemKey: "mobileNo" },
  jobTitle: { type: "shortText", label: "Job title", placeholder: "Software Engineer", systemKey: "jobTitle" },
  website: { type: "shortText", label: "Website", placeholder: "www.example.com", systemKey: "website" },
};

export function normalizeLeadFormFields(fields?: LeadFormConfig["fields"]): LeadFormField[] {
  if (!Array.isArray(fields) || fields.length === 0) return DEFAULT_LEAD_FORM_FIELDS;
  const normalized = fields.flatMap((field, index) => {
    if (typeof field === "string" && field in legacyMeta) {
      return [{ id: field, ...legacyMeta[field as LegacyLeadFormFieldKey] }];
    }
    if (!field || typeof field !== "object" || !field.type || !field.label) return [];
    return [{ ...field, id: field.id || `field-${index}` }];
  });
  const hasName = normalized.some((field) => field.systemKey === "name");
  return hasName
    ? normalized
    : [{ id: "name", type: "shortText", label: "Name", placeholder: "Your name", required: true, systemKey: "name" }, ...normalized];
}

interface Props {
  widgetId?: string;
  config: LeadFormConfig;
  mode: "builder" | "public";
  micrositeId?: string;
  parentId?: string;
}

const inputClass =
  "w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-[13px] font-medium text-gray-950 outline-none placeholder:text-gray-400 focus:border-black/30 disabled:cursor-default";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LeadFormCard: FC<Props> = ({ widgetId, config, mode, micrositeId, parentId }) => {
  const isPublic = mode === "public";
  const fields = useMemo(() => normalizeLeadFormFields(config?.fields), [config?.fields]);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const setValue = (key: string, value: string | string[]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isPublic || status !== "idle") return;
    for (const field of fields) {
      const value = values[field.id];
      if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
        setErrorMessage(`${field.label} is required`);
        return;
      }
    }
    const emailField = fields.find((field) => field.systemKey === "email");
    const email = emailField ? String(values[emailField.id] || "").trim() : "";
    if (email && !EMAIL_REGEX.test(email)) {
      setErrorMessage("Enter a valid email address");
      return;
    }
    if (!parentId || !micrositeId) {
      setErrorMessage("This form isn't set up yet");
      return;
    }

    const systemValues: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.systemKey) systemValues[field.systemKey] = String(values[field.id] || "").trim();
    });
    const answers = fields.map((field) => ({
      fieldId: field.id,
      label: field.label,
      value: values[field.id] ?? "",
    }));

    setErrorMessage("");
    setStatus("submitting");
    try {
      const result = await handleLeadFormSubmit({
        parentId,
        micrositeId,
        name: systemValues.name || "Smartsite visitor",
        email: systemValues.email,
        mobileNo: systemValues.mobileNo,
        jobTitle: systemValues.jobTitle,
        website: systemValues.website,
        source: `form:${widgetId || ""}`,
        formName: config?.title || "Form",
        answers,
      });
      if (result?.state === "success") setStatus("success");
      else throw new Error(result?.message || "Something went wrong");
    } catch (error) {
      console.error(error);
      setStatus("idle");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  if (status === "success") {
    return (
      <div className="my-2 w-full rounded-[22px] border border-black/[0.06] bg-white px-5 py-9 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 size={28} className="text-emerald-600" />
        </div>
        <p className="mt-3 text-lg font-bold text-gray-950">{config?.successMessage || "Thanks — we got it!"}</p>
        <p className="mt-1 text-sm text-gray-500">We’ll be in touch shortly.</p>
        <button type="button" onClick={() => { setValues({}); setStatus("idle"); }} className="mt-4 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold">
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="my-2 w-full rounded-[22px] border border-black/[0.06] bg-white p-5 shadow-[0_8px_28px_-16px_rgba(10,10,12,.16)]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"><ClipboardList size={18} /></div>
        <div>
          <p className="text-[18px] font-bold tracking-tight text-gray-950">{config?.title || "Work with us"}</p>
          <p className="mt-0.5 text-[13px] text-gray-500">{config?.description || "Tell us a bit and we’ll reach out."}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
        {fields.map((field) => (
          <FormField key={field.id} field={field} value={values[field.id]} setValue={(value) => setValue(field.id, value)} disabled={!isPublic || status !== "idle"} />
        ))}
        {isPublic ? (
          <button type="submit" disabled={status !== "idle"} className="mt-1 w-full rounded-[14px] bg-gray-950 py-3 text-sm font-bold text-white disabled:opacity-50">
            {status === "submitting" ? <Loader className="mx-auto h-5 w-5 animate-spin" /> : config?.buttonText || "Submit"}
          </button>
        ) : (
          <div className="mt-1 w-full rounded-[14px] bg-gray-950 py-3 text-center text-sm font-bold text-white">{config?.buttonText || "Submit"}</div>
        )}
        {errorMessage && <p className="text-center text-xs font-medium text-red-500">{errorMessage}</p>}
      </form>
    </div>
  );
};

function FormField({ field, value, setValue, disabled }: { field: LeadFormField; value?: string | string[]; setValue: (value: string | string[]) => void; disabled: boolean }) {
  const label = <p className="mb-1.5 text-xs font-semibold text-gray-950">{field.label}{field.required && <span className="text-red-500"> *</span>}</p>;
  if (field.type === "longText") return <label>{label}<textarea rows={3} disabled={disabled} value={String(value || "")} onChange={(event) => setValue(event.target.value)} placeholder={field.placeholder} className={`${inputClass} resize-none`} /></label>;
  if (field.type === "date") return <label>{label}<input type="date" disabled={disabled} value={String(value || "")} onChange={(event) => setValue(event.target.value)} className={inputClass} /></label>;
  if (field.type === "dropdown") return <label>{label}<select disabled={disabled} value={String(value || "")} onChange={(event) => setValue(event.target.value)} className={inputClass}><option value="">Select…</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select></label>;
  if (field.type === "choice") return <div>{label}<div className="flex flex-col gap-2">{field.options?.map((option) => <button type="button" disabled={disabled} key={option} onClick={() => setValue(option)} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm ${value === option ? "border-gray-950 font-semibold" : "border-black/[0.08]"}`}><span className={`h-4 w-4 rounded-full border-[5px] ${value === option ? "border-gray-950" : "border-gray-300"}`} />{option}</button>)}</div></div>;
  if (field.type === "checkboxes") {
    const selected = Array.isArray(value) ? value : [];
    return <div>{label}<div className="flex flex-col gap-2">{field.options?.map((option) => <label key={option} className="flex items-center gap-2.5 rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm"><input type="checkbox" disabled={disabled} checked={selected.includes(option)} onChange={() => setValue(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])} className="h-4 w-4 accent-black" />{option}</label>)}</div></div>;
  }
  return <label>{label}<input type={field.systemKey === "email" ? "email" : "text"} disabled={disabled} value={String(value || "")} onChange={(event) => setValue(event.target.value)} placeholder={field.placeholder} className={inputClass} /></label>;
}

export default LeadFormCard;
