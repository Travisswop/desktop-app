"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  CircleDot,
  GripVertical,
  ListFilter,
  Loader,
  Pencil,
  Plus,
  TextCursorInput,
  Trash2,
} from "lucide-react";
import {
  DEFAULT_LEAD_FORM_FIELDS,
  LEAD_FORM_FIELD_TYPE_META,
  type LeadFormField,
  type LeadFormFieldType,
} from "@/components/publicProfile/widgets/LeadFormCard";

export type LeadFormBuilderConfig = {
  title: string;
  description: string;
  buttonText: string;
  successMessage: string;
  fields: LeadFormField[];
};

const TYPE_ICONS: Record<LeadFormFieldType, typeof TextCursorInput> = {
  shortText: TextCursorInput,
  longText: ListFilter,
  choice: CircleDot,
  checkboxes: CheckSquare,
  dropdown: ChevronDown,
  date: CalendarDays,
};

const inputClass =
  "w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-black/30";

const cloneFields = (fields?: LeadFormField[]) =>
  (fields?.length ? fields : DEFAULT_LEAD_FORM_FIELDS).map((field) => ({
    ...field,
    options: field.options ? [...field.options] : undefined,
  }));

export default function LeadFormBuilder({
  initialConfig,
  saving,
  onSave,
}: {
  initialConfig?: Partial<LeadFormBuilderConfig>;
  saving: boolean;
  onSave: (config: LeadFormBuilderConfig) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(initialConfig?.title || "Work with us");
  const [fields, setFields] = useState<LeadFormField[]>(() => cloneFields(initialConfig?.fields));
  const [openId, setOpenId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const patchField = (id: string, patch: Partial<LeadFormField>) =>
    setFields((current) => current.map((field) => (field.id === id ? { ...field, ...patch } : field)));

  const moveField = (targetId: string) =>
    setFields((current) => {
      const from = current.findIndex((field) => field.id === draggedId);
      const to = current.findIndex((field) => field.id === targetId);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...current];
      const [field] = next.splice(from, 1);
      next.splice(to, 0, field);
      return next;
    });

  const addField = (type: LeadFormFieldType) => {
    const meta = LEAD_FORM_FIELD_TYPE_META[type];
    const field: LeadFormField = {
      id: `field-${type}-${Date.now()}`,
      type,
      label: meta.defaultLabel,
      placeholder: meta.placeholder,
      options: meta.options ? [...meta.options] : undefined,
      required: false,
    };
    setFields((current) => [...current, field]);
    setOpenId(field.id);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || fields.length === 0) return;
    await onSave({
      title: title.trim(),
      description: initialConfig?.description || "Tell us a bit and we’ll reach out.",
      buttonText: "Submit",
      successMessage: initialConfig?.successMessage || "Thanks — we got it!",
      fields,
    });
  };

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-[400px] overflow-hidden rounded-[28px] bg-white text-[#0a0a0c]">
      <div className="max-h-[min(760px,82vh)] overflow-y-auto px-[22px] pb-[22px] pt-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold leading-6">Build form</h2>
            <p className="text-xs text-[#8a8a8f]">Tap a field to edit it</p>
          </div>
          <button type="submit" disabled={saving || !title.trim() || fields.length === 0} className="min-w-[60px] rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">
            {saving ? <Loader className="mx-auto h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs text-[#8a8a8f]">Form name</span>
          <input aria-label="Form name" value={title} onChange={(event) => setTitle(event.target.value)} className={`${inputClass} font-semibold`} placeholder="e.g. Work with us" />
        </label>

        <div className="flex flex-col gap-2.5">
          {fields.map((field) => {
            const FieldIcon = TYPE_ICONS[field.type];
            const open = openId === field.id;
            return (
              <div
                key={field.id}
                draggable={!open}
                onDragStart={() => setDraggedId(field.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => moveField(field.id)}
                onDragEnd={() => setDraggedId(null)}
                className={`overflow-hidden rounded-[14px] border bg-white ${open ? "border-black" : "border-black/[0.08]"} ${draggedId === field.id ? "opacity-50" : ""}`}
              >
                <button type="button" onClick={() => setOpenId(open ? null : field.id)} className="flex w-full items-center gap-2.5 p-3 text-left">
                  <GripVertical size={15} className="text-[#9b9b9f]" />
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3f3f3]"><FieldIcon size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{field.label}{field.required ? <span className="text-red-500"> *</span> : null}</span>
                    <span className="block text-[11px] text-[#8a8a8f]">{LEAD_FORM_FIELD_TYPE_META[field.type].label}</span>
                  </span>
                  {open ? <ChevronDown size={16} className="rotate-180 text-[#8a8a8f]" /> : <Pencil size={15} className="text-[#8a8a8f]" />}
                </button>

                {open ? (
                  <div className="flex flex-col gap-3 border-t border-black/[0.06] p-3">
                    <label><span className="mb-1 block text-xs text-[#8a8a8f]">Field label</span><input aria-label="Field label" value={field.label} onChange={(event) => patchField(field.id, { label: event.target.value })} className={inputClass} /></label>
                    {!field.options && field.type !== "date" ? <label><span className="mb-1 block text-xs text-[#8a8a8f]">Placeholder</span><input aria-label="Placeholder" value={field.placeholder || ""} onChange={(event) => patchField(field.id, { placeholder: event.target.value })} className={inputClass} placeholder="Hint text…" /></label> : null}
                    {field.options ? (
                      <div>
                        <span className="mb-1.5 block text-xs text-[#8a8a8f]">Options</span>
                        <div className="flex flex-col gap-2">
                          {field.options.map((option, optionIndex) => (
                            <div key={`${field.id}-${optionIndex}`} className="flex gap-2">
                              <input aria-label={`Option ${optionIndex + 1}`} value={option} onChange={(event) => patchField(field.id, { options: field.options?.map((item, index) => index === optionIndex ? event.target.value : item) })} className={inputClass} />
                              <button type="button" aria-label={`Delete ${option}`} onClick={() => patchField(field.id, { options: field.options?.filter((_, index) => index !== optionIndex) })} className="rounded-xl border border-black/[0.08] px-3 text-red-600"><Trash2 size={15} /></button>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => patchField(field.id, { options: [...(field.options || []), "New option"] })} className="mt-2 flex items-center gap-1 text-xs font-semibold"><Plus size={14} />Add option</button>
                      </div>
                    ) : null}
                    <div className="flex items-center border-t border-black/[0.06] pt-3">
                      <button type="button" onClick={() => patchField(field.id, { required: !field.required })} className="flex items-center gap-2 text-sm font-semibold">
                        <span className={`relative h-6 w-10 rounded-full ${field.required ? "bg-black" : "bg-[#d8d8dc]"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${field.required ? "left-[18px]" : "left-0.5"}`} /></span>
                        Required
                      </button>
                      <button type="button" onClick={() => { setFields((current) => current.filter((item) => item.id !== field.id)); setOpenId(null); }} className="ml-auto flex items-center gap-1.5 text-xs font-medium text-red-600"><Trash2 size={14} />Delete</button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a8a8f]">Add field</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(LEAD_FORM_FIELD_TYPE_META) as LeadFormFieldType[]).map((type) => {
              const FieldIcon = TYPE_ICONS[type];
              return <button key={type} type="button" onClick={() => addField(type)} className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl bg-[#f2f2f2] px-2 text-[11px] font-semibold"><FieldIcon size={17} />{LEAD_FORM_FIELD_TYPE_META[type].label}</button>;
            })}
          </div>
        </div>
      </div>
    </form>
  );
}
