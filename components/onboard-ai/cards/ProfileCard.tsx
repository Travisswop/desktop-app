"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import Image from "next/image";
import { CalendarDays, Loader2, Upload } from "lucide-react";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { useToast } from "@/hooks/use-toast";
import { Calendar, type CalendarProps } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const inputToLocalDate = (value: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const dateToInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const inputToDisplay = (value: string) => {
  const date = inputToLocalDate(value);
  return date
    ? date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    : "";
};

const BIRTHDAY_FROM_YEAR = 1900;

const TERMINAL_CALENDAR_CLASS_NAMES: CalendarProps["classNames"] = {
  months: "flex flex-col",
  month: "space-y-3",
  caption:
    "relative flex min-h-12 items-center rounded-[10px] border border-[#3fe08f]/15 bg-black/65 px-2 py-2 pr-[76px]",
  caption_dropdowns: "flex w-full items-center gap-2",
  vhidden: "sr-only",
  dropdown_month: "relative min-w-0 flex-1",
  dropdown_year: "relative w-[86px] shrink-0",
  dropdown: "absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0",
  dropdown_icon: "ml-1 h-3 w-3 shrink-0 text-[#3fe08f]",
  caption_label:
    "dm-mono flex h-8 w-full items-center justify-between rounded-[8px] border border-[#3fe08f]/20 bg-[#050806] px-2 text-[11px] font-bold uppercase text-[#dfffee] transition",
  nav: "absolute right-2 top-2 flex items-center gap-1",
  nav_button:
    "grid h-8 w-8 place-items-center rounded-[8px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 p-0 text-[#3fe08f] opacity-85 transition hover:border-[#3fe08f]/50 hover:bg-[#3fe08f]/15 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3fe08f]/25",
  nav_button_previous: "",
  nav_button_next: "",
  table: "w-full border-collapse",
  head_row: "grid grid-cols-7",
  head_cell:
    "dm-mono grid h-8 place-items-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]",
  row: "mt-1 grid grid-cols-7 gap-1",
  cell: "relative grid h-9 place-items-center",
  day: "dm-mono grid h-8 w-8 place-items-center rounded-[8px] border border-transparent bg-transparent p-0 text-[12px] font-bold text-[#d7dce2] transition hover:border-[#3fe08f]/35 hover:bg-[#3fe08f]/10 hover:text-[#9df6c3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3fe08f]/35",
  day_selected:
    "border-[#3fe08f] bg-[#3fe08f] text-[#031008] shadow-[0_0_18px_rgba(63,224,143,0.35)] hover:bg-[#64f2aa] hover:text-[#031008]",
  day_today: "border-[#3fe08f]/45 text-[#3fe08f]",
  day_outside: "text-[#3d4149] opacity-50",
  day_disabled: "text-[#343841] opacity-30",
  day_hidden: "invisible",
};

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
  const [calendarOpen, setCalendarOpen] = useState(false);
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

  const birthdayInput = dobToInput(values.dob);
  const selectedBirthday = inputToLocalDate(birthdayInput);
  const today = new Date();
  const defaultBirthdayMonth =
    selectedBirthday ?? new Date(today.getFullYear() - 18, today.getMonth(), 1);

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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>
              Birthday <span className="text-[#3fe08f]">*</span>
            </FieldLabel>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={isSaving}
                  aria-label="Birthday"
                  className={`${TICKET_FIELD_CLASS} group flex items-center justify-between gap-2 text-left`}
                >
                  <span
                    className={
                      birthdayInput ? "text-[#eceef2]" : "text-[#5a5e69]"
                    }
                  >
                    {birthdayInput ? inputToDisplay(birthdayInput) : "MM/DD/YYYY"}
                  </span>
                  <CalendarDays className="h-4 w-4 shrink-0 text-[#3fe08f] transition group-hover:text-[#64f2aa]" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={8}
                className="w-[min(360px,calc(100vw-2rem))] rounded-[14px] border border-[#3fe08f]/25 bg-[#050806] p-3 text-[#eceef2] shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(63,224,143,0.08),0_0_42px_rgba(63,224,143,0.16)]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 50% 0%, rgba(63,224,143,0.12), transparent 45%), repeating-linear-gradient(0deg, rgba(63,224,143,0.045) 0px, rgba(63,224,143,0.045) 1px, transparent 1px, transparent 24px)",
                }}
              >
                <Calendar
                  mode="single"
                  selected={selectedBirthday}
                  defaultMonth={defaultBirthdayMonth}
                  fromYear={BIRTHDAY_FROM_YEAR}
                  toYear={today.getFullYear()}
                  toDate={today}
                  disabled={{ after: today }}
                  captionLayout="dropdown-buttons"
                  initialFocus
                  className="p-0"
                  classNames={TERMINAL_CALENDAR_CLASS_NAMES}
                  onSelect={(date) => {
                    if (!date) return;
                    set("dob")(inputToDob(dateToInput(date)));
                    setCalendarOpen(false);
                  }}
                />
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#3fe08f]/10 pt-3">
                  <button
                    type="button"
                    disabled={!birthdayInput}
                    onClick={() => {
                      set("dob")("");
                      setCalendarOpen(false);
                    }}
                    className="dm-mono rounded-[8px] border border-white/[0.08] bg-black px-3 py-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#9aa0aa] transition hover:border-[#3fe08f]/30 hover:text-[#dfffee] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Clear
                  </button>
                  <span className="dm-mono truncate text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                    {birthdayInput || "No date selected"}
                  </span>
                </div>
              </PopoverContent>
            </Popover>
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
