"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AGENT_PANEL_CLASS,
  FieldLabel,
  GHOST_BUTTON_CLASS,
  PRIMARY_BUTTON_CLASS,
  TICKET_FIELD_CLASS,
  TICKET_LABEL_CLASS,
} from "../chatStyles";
import type { AiOnboardingProfile } from "../types";

export type SocialLinksValues = Pick<
  AiOnboardingProfile,
  | "website"
  | "instagram"
  | "twitter"
  | "linkedin"
  | "tiktok"
  | "facebook"
  | "whatsapp"
>;

const FIELDS: Array<{ key: keyof SocialLinksValues; label: string; placeholder: string }> =
  [
    { key: "website", label: "Website", placeholder: "https://yoursite.com" },
    { key: "instagram", label: "Instagram", placeholder: "@handle or URL" },
    { key: "twitter", label: "X", placeholder: "@handle or URL" },
    { key: "linkedin", label: "LinkedIn", placeholder: "Profile URL" },
    { key: "tiktok", label: "TikTok", placeholder: "@handle or URL" },
    { key: "facebook", label: "Facebook", placeholder: "Profile URL" },
    { key: "whatsapp", label: "WhatsApp", placeholder: "Number or link" },
  ];

const EMPTY: SocialLinksValues = {
  website: "",
  instagram: "",
  twitter: "",
  linkedin: "",
  tiktok: "",
  facebook: "",
  whatsapp: "",
};

interface SocialLinksCardProps {
  initial?: Partial<SocialLinksValues>;
  done?: boolean;
  isSaving?: boolean;
  onSubmit: (values: SocialLinksValues) => void;
}

export default function SocialLinksCard({
  initial,
  done,
  isSaving,
  onSubmit,
}: SocialLinksCardProps) {
  const [values, setValues] = useState<SocialLinksValues>({
    ...EMPTY,
    ...initial,
  });

  const set = (key: keyof SocialLinksValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const submit = (vals: SocialLinksValues) => {
    if (isSaving || done) return;
    onSubmit(vals);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(values);
  };

  if (done) {
    const filled = FIELDS.filter(({ key }) => values[key]?.trim());
    return (
      <div className={`${AGENT_PANEL_CLASS} w-full max-w-[420px] p-4`}>
        <p className={`${TICKET_LABEL_CLASS} mb-2`}>Links added</p>
        {filled.length === 0 ? (
          <p className="text-[12.5px] text-[#a9adb8]">No links added.</p>
        ) : (
          <div className="space-y-1.5">
            {filled.map(({ key, label }) => (
              <div key={key} className="flex gap-2 text-[12.5px]">
                <span className={`${TICKET_LABEL_CLASS} w-16 shrink-0 pt-0.5`}>
                  {label}
                </span>
                <span className="break-words font-semibold text-[#eceef2]">
                  {values[key]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`${AGENT_PANEL_CLASS} w-full max-w-[420px] p-4`}
    >
      <div className="mb-3 border-b border-white/[0.07] pb-3">
        <p className={TICKET_LABEL_CLASS}>Step 2 · Your links</p>
        <h3 className="mt-1 text-[15px] font-semibold text-[#eceef2]">
          Add the links for your SmartSite
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <FieldLabel>{label}</FieldLabel>
            <input
              value={values[key]}
              onChange={(e) => set(key)(e.target.value)}
              placeholder={placeholder}
              className={TICKET_FIELD_CLASS}
              disabled={isSaving}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => submit(EMPTY)}
          className={`${GHOST_BUTTON_CLASS} flex-1`}
        >
          Skip for now
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className={`${PRIMARY_BUTTON_CLASS} flex-1`}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving
            </>
          ) : (
            "Save links"
          )}
        </button>
      </div>
    </form>
  );
}
