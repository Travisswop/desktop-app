"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { useToast } from "@/hooks/use-toast";
import {
  AGENT_PANEL_CLASS,
  FieldLabel,
  PRIMARY_BUTTON_CLASS,
  TICKET_FIELD_CLASS,
  TICKET_LABEL_CLASS,
} from "../chatStyles";
import type { AiOnboardingProfile } from "../types";

export interface ProfileCardValues {
  name: string;
  bio: string;
  phone: string;
  email: string;
  officeAddress: string;
  /** Birthday as an epoch-ms timestamp string (matches the backend `dob`). */
  dob: string;
  /** Cloudinary URL once a photo is uploaded, otherwise an avatar id ("1"). */
  profilePic: string;
}

/** epoch-ms string <-> yyyy-mm-dd for the date input */
const dobToInput = (dob: string) =>
  dob ? new Date(Number(dob)).toISOString().split("T")[0] : "";
const inputToDob = (value: string) =>
  value ? new Date(value).getTime().toString() : "";

/** Resolve a profilePic value (avatar id or full URL) to an <img> src. */
const resolveAvatarSrc = (profilePic: string) =>
  profilePic.startsWith("http") || profilePic.startsWith("data:")
    ? profilePic
    : `/images/user_avator/${profilePic || "1"}.png`;

interface ProfileCardProps {
  initial: Pick<
    AiOnboardingProfile,
    "name" | "bio" | "phone" | "email" | "officeAddress"
  > & { profilePic?: string; dob?: string };
  /** When true the card is locked (submitted) and shows a read-only summary. */
  done?: boolean;
  isSaving?: boolean;
  submitLabel?: string;
  savingLabel?: string;
  onSubmit: (values: ProfileCardValues) => void;
}

export default function ProfileCard({
  initial,
  done,
  isSaving,
  submitLabel = "Save profile",
  savingLabel = "Saving",
  onSubmit,
}: ProfileCardProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [values, setValues] = useState<ProfileCardValues>({
    name: initial.name || "",
    bio: initial.bio || "",
    phone: initial.phone || "",
    email: initial.email || "",
    officeAddress: initial.officeAddress || "",
    dob: initial.dob || "",
    profilePic: initial.profilePic || "1",
  });

  const set = (key: keyof ProfileCardValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      // Optimistic preview, then swap for the hosted URL once uploaded.
      set("profilePic")(dataUrl);
      setIsUploading(true);
      try {
        const url = await uploadImageToCloudinary(dataUrl);
        set("profilePic")(url || "1");
      } catch (error) {
        console.error("Avatar upload failed:", error);
        toast({
          variant: "destructive",
          title: "Photo upload failed",
          description: "Keeping the default avatar — you can change it later.",
        });
        set("profilePic")("1");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!values.name.trim() || !values.dob || isSaving || done || isUploading)
      return;
    onSubmit({ ...values, name: values.name.trim() });
  };

  if (done) {
    return (
      <div className={`${AGENT_PANEL_CLASS} w-full max-w-[420px] p-4`}>
        <div className="mb-2 flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-full border border-white/[0.12] bg-black">
            <Image
              src={resolveAvatarSrc(values.profilePic)}
              alt="Profile photo"
              width={32}
              height={32}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
          <p className={TICKET_LABEL_CLASS}>Profile saved</p>
        </div>
        <div className="space-y-1.5">
          <SummaryRow label="Name" value={values.name} />
          {values.dob && (
            <SummaryRow label="Birthday" value={dobToInput(values.dob)} />
          )}
          {values.bio && <SummaryRow label="Bio" value={values.bio} />}
          {values.email && <SummaryRow label="Email" value={values.email} />}
          {values.phone && <SummaryRow label="Phone" value={values.phone} />}
          {values.officeAddress && (
            <SummaryRow label="Address" value={values.officeAddress} />
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`${AGENT_PANEL_CLASS} w-full max-w-[420px] p-4`}
    >
      <div className="mb-3 border-b border-white/[0.07] pb-3">
        <p className={TICKET_LABEL_CLASS}>Step 1 · Your profile</p>
        <h3 className="mt-1 text-[15px] font-semibold text-[#eceef2]">
          Tell people who you are
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/[0.12] bg-black">
            <Image
              src={resolveAvatarSrc(values.profilePic)}
              alt="Profile photo"
              width={56}
              height={56}
              className="h-full w-full object-cover"
              unoptimized
            />
            {isUploading && (
              <div className="absolute inset-0 grid place-items-center bg-black/60">
                <Loader2 className="h-4 w-4 animate-spin text-[#3fe08f]" />
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaving || isUploading}
              className="inline-flex items-center gap-2 rounded-[9px] border border-white/[0.07] bg-[#101217] px-3 py-2 text-[12px] font-semibold text-[#eceef2] transition hover:bg-white/[0.05] disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {values.profilePic === "1" ? "Add photo" : "Change photo"}
            </button>
            <p className="mt-1 text-[11px] text-[#5a5e69]">
              Optional — you can change it anytime.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        <div>
          <FieldLabel>
            Name <span className="text-[#3fe08f]">*</span>
          </FieldLabel>
          <input
            value={values.name}
            onChange={(e) => set("name")(e.target.value)}
            placeholder="Your name"
            className={TICKET_FIELD_CLASS}
            disabled={isSaving}
            required
          />
        </div>

        <div>
          <FieldLabel>Bio</FieldLabel>
          <input
            value={values.bio}
            onChange={(e) => set("bio")(e.target.value)}
            placeholder="What should people know?"
            className={TICKET_FIELD_CLASS}
            disabled={isSaving}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Email</FieldLabel>
            <input
              type="email"
              value={values.email}
              onChange={(e) => set("email")(e.target.value)}
              placeholder="you@email.com"
              className={TICKET_FIELD_CLASS}
              disabled={isSaving}
            />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <input
              type="tel"
              value={values.phone}
              onChange={(e) => set("phone")(e.target.value)}
              placeholder="+1 555 000 0000"
              className={TICKET_FIELD_CLASS}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>
              Birthday <span className="text-[#3fe08f]">*</span>
            </FieldLabel>
            <input
              type="date"
              max={new Date().toISOString().split("T")[0]}
              value={dobToInput(values.dob)}
              onChange={(e) => set("dob")(inputToDob(e.target.value))}
              className={`${TICKET_FIELD_CLASS} [color-scheme:dark]`}
              disabled={isSaving}
              required
            />
          </div>
          <div>
            <FieldLabel>Address</FieldLabel>
            <input
              value={values.officeAddress}
              onChange={(e) => set("officeAddress")(e.target.value)}
              placeholder="City or office address"
              className={TICKET_FIELD_CLASS}
              disabled={isSaving}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!values.name.trim() || !values.dob || isSaving || isUploading}
        className={`${PRIMARY_BUTTON_CLASS} mt-4 w-full`}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {savingLabel}
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-[12.5px]">
      <span className={`${TICKET_LABEL_CLASS} w-16 shrink-0 pt-0.5`}>
        {label}
      </span>
      <span className="break-words font-semibold text-[#eceef2]">{value}</span>
    </div>
  );
}
