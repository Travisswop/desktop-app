"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  CircleDot,
  GripVertical,
  ListFilter,
  Loader,
  Plus,
  TextCursorInput,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { handleCreateWidget } from "@/actions/widget";
import LeadFormCard, {
  DEFAULT_LEAD_FORM_FIELDS,
  LEAD_FORM_FIELD_TYPE_META,
  LeadFormField,
  LeadFormFieldType,
} from "@/components/publicProfile/widgets/LeadFormCard";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";

const inputClass =
  "w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-black/30";
const TYPE_ICONS: Record<LeadFormFieldType, typeof TextCursorInput> = {
  shortText: TextCursorInput,
  longText: ListFilter,
  choice: CircleDot,
  checkboxes: CheckSquare,
  dropdown: ChevronDown,
  date: CalendarDays,
};

const AddLeadForm = ({ onCloseModal }: { onCloseModal: () => void }) => {
  const smartsite: any = useSmartSiteApiDataStore((state) => state);
  const [token, setToken] = useState("");
  const [title, setTitle] = useState("Work with us");
  const [description, setDescription] = useState("Tell us a bit and we’ll reach out.");
  const [successMessage, setSuccessMessage] = useState("Thanks — we got it!");
  const [fields, setFields] = useState<LeadFormField[]>(() => DEFAULT_LEAD_FORM_FIELDS.map((field) => ({ ...field, options: field.options ? [...field.options] : undefined })));
  const [openId, setOpenId] = useState<string | null>(fields[0]?.id || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => setToken(Cookies.get("access-token") || ""), []);

  const patchField = (id: string, patch: Partial<LeadFormField>) =>
    setFields((current) => current.map((field) => (field.id === id ? { ...field, ...patch } : field)));

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    setFields((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addField = (type: LeadFormFieldType) => {
    const meta = LEAD_FORM_FIELD_TYPE_META[type];
    const field: LeadFormField = {
      id: `field-${Date.now()}`,
      type,
      label: meta.defaultLabel,
      placeholder: meta.placeholder,
      options: meta.options ? [...meta.options] : undefined,
      required: false,
    };
    setFields((current) => [...current, field]);
    setOpenId(field.id);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return toast.error("Add a form name");
    if (fields.length === 0) return toast.error("Add at least one field");
    setIsLoading(true);
    try {
      const result = await handleCreateWidget(
        {
          micrositeId: smartsite._id,
          widgetType: "leadForm",
          config: {
            title: title.trim(),
            description: description.trim(),
            buttonText: "Submit",
            successMessage: successMessage.trim(),
            fields,
          },
        },
        token,
      );
      if (result?.state !== "success") throw new Error(result?.message);
      toast.success("Form added");
      onCloseModal();
    } catch (error) {
      console.error(error);
      toast.error("Could not add form");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={save} className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-[#0a0a0c]">Build form</h2>
        <p className="mt-0.5 text-xs text-[#8a8a8f]">Tap a field to edit it, then arrange the order</p>
      </div>

      <label>
        <span className="mb-1.5 block text-xs font-semibold text-[#8a8a8f]">Form name</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} className={`${inputClass} font-semibold`} placeholder="Work with us" />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-semibold text-[#8a8a8f]">Description</span>
        <input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} />
      </label>

      <div className="flex flex-col gap-2.5">
        {fields.map((field, index) => {
          const Icon = TYPE_ICONS[field.type];
          const open = openId === field.id;
          return (
            <div key={field.id} className={`overflow-hidden rounded-[14px] border bg-white ${open ? "border-gray-950" : "border-black/[0.08]"}`}>
              <button type="button" onClick={() => setOpenId(open ? null : field.id)} className="flex w-full items-center gap-2.5 p-3 text-left">
                <GripVertical size={17} className="text-gray-300" />
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100"><Icon size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{field.label}{field.required && <span className="text-red-500"> *</span>}</span>
                  <span className="block text-[11px] text-gray-500">{LEAD_FORM_FIELD_TYPE_META[field.type].label}</span>
                </span>
                <ChevronDown size={17} className={`text-gray-500 transition ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="flex flex-col gap-3 border-t border-black/[0.06] p-3">
                  <label><span className="mb-1 block text-xs font-semibold text-gray-500">Field label</span><input value={field.label} onChange={(event) => patchField(field.id, { label: event.target.value })} className={inputClass} /></label>
                  {!field.options && field.type !== "date" && <label><span className="mb-1 block text-xs font-semibold text-gray-500">Placeholder</span><input value={field.placeholder || ""} onChange={(event) => patchField(field.id, { placeholder: event.target.value })} className={inputClass} /></label>}
                  {field.options && (
                    <div>
                      <span className="mb-1.5 block text-xs font-semibold text-gray-500">Options</span>
                      <div className="flex flex-col gap-2">
                        {field.options.map((option, optionIndex) => (
                          <div key={`${field.id}-${optionIndex}`} className="flex gap-2">
                            <input value={option} onChange={(event) => patchField(field.id, { options: field.options?.map((item, i) => (i === optionIndex ? event.target.value : item)) })} className={inputClass} />
                            <button type="button" aria-label={`Delete ${option}`} onClick={() => patchField(field.id, { options: field.options?.filter((_, i) => i !== optionIndex) })} className="rounded-xl border border-black/[0.08] px-3 text-red-600"><Trash2 size={15} /></button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => patchField(field.id, { options: [...(field.options || []), "New option"] })} className="mt-2 flex items-center gap-1 text-xs font-semibold"><Plus size={14} /> Add option</button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 border-t border-black/[0.06] pt-3">
                    <button type="button" onClick={() => patchField(field.id, { required: !field.required })} className="flex items-center gap-2 text-sm font-semibold">
                      <span className={`relative h-6 w-10 rounded-full ${field.required ? "bg-gray-950" : "bg-gray-300"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${field.required ? "left-[18px]" : "left-0.5"}`} /></span>
                      Required
                    </button>
                    <div className="ml-auto flex gap-1">
                      <button type="button" aria-label="Move field up" disabled={index === 0} onClick={() => moveField(index, -1)} className="rounded-lg border p-1.5 disabled:opacity-30"><ChevronUp size={15} /></button>
                      <button type="button" aria-label="Move field down" disabled={index === fields.length - 1} onClick={() => moveField(index, 1)} className="rounded-lg border p-1.5 disabled:opacity-30"><ChevronDown size={15} /></button>
                      <button type="button" aria-label="Delete field" onClick={() => { setFields((current) => current.filter((item) => item.id !== field.id)); setOpenId(null); }} className="rounded-lg border p-1.5 text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8a8a8f]">Add field</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(LEAD_FORM_FIELD_TYPE_META) as LeadFormFieldType[]).map((type) => {
            const Icon = TYPE_ICONS[type];
            return <button key={type} type="button" onClick={() => addField(type)} className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-black/10 bg-gray-50 px-2 py-3 text-[11px] font-semibold"><Icon size={18} />{LEAD_FORM_FIELD_TYPE_META[type].label}</button>;
          })}
        </div>
      </div>

      <label><span className="mb-1.5 block text-xs font-semibold text-[#8a8a8f]">Thank-you message</span><input value={successMessage} onChange={(event) => setSuccessMessage(event.target.value)} className={inputClass} /></label>

      <div>
        <p className="mb-2 text-xs font-semibold text-[#8a8a8f]">Live preview</p>
        <div className="rounded-2xl bg-gray-100 p-3"><LeadFormCard mode="builder" config={{ title, description, successMessage, fields }} /></div>
      </div>

      <PrimaryButton className="w-full py-3" disabled={isLoading}>{isLoading ? <Loader className="mx-auto h-5 w-5 animate-spin" /> : "Save Form"}</PrimaryButton>
    </form>
  );
};

export default AddLeadForm;
