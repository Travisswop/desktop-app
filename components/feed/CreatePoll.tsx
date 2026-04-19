"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useModalStore } from "@/zustandStore/modalstore";
import { postFeed } from "@/actions/postFeed";
import { useUser } from "@/lib/UserContext";
import toast from "react-hot-toast";
import { Loader, X, ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";

interface PollOption {
  text: string;
  image: string | null; // base64 preview or null
}

export default function CreatePoll({ setIsCreatePollModalOpen }: any) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<PollOption[]>([
    { text: "", image: null },
    { text: "", image: null },
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [durationDays, setDurationDays] = useState<number | "">(1);
  const [durationHours, setDurationHours] = useState<number | "">(0);
  const [durationMinutes, setDurationMinutes] = useState<number | "">(0);
  const [isCreatePollLoading, setIsCreatePollLoading] = useState(false);

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { closeModal } = useModalStore();
  const { user, accessToken } = useUser();
  const router = useRouter();

  const handleOptionTextChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index].text = value;
    setOptions(updated);
  };

  const handleImageClick = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  const handleImageChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const updated = [...options];
      updated[index].image = reader.result as string;
      setOptions(updated);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    const updated = [...options];
    updated[index].image = null;
    setOptions(updated);
  };

  const addOption = () => {
    setOptions([...options, { text: "", image: null }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return; // minimum 2 options
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const validOptions = options.filter((opt) => opt.text.trim() !== "");

    if (!question.trim() || validOptions.length < 2) {
      toast.error("Please enter a question and at least 2 options.", {
        position: "top-right",
      });
      return;
    }

    if (!user || !user?.primaryMicrosite || !user?._id) {
      return toast.error("Please login first", { position: "top-right" });
    }

    if (
      !Number(durationDays) &&
      !Number(durationHours) &&
      !Number(durationMinutes)
    ) {
      return toast.error("Please set a poll duration!", {
        position: "top-right",
      });
    }

    setIsCreatePollLoading(true);

    try {
      // Upload images to Cloudinary for options that have images
      const uploadedOptions = await Promise.all(
        validOptions.map(async (opt) => {
          if (opt.image && opt.image.startsWith("data:")) {
            const imageUrl = await sendCloudinaryImage(opt.image);
            return { text: opt.text, image: imageUrl };
          }
          return { text: opt.text, image: null };
        }),
      );

      const payload = {
        smartsiteId: user?.primaryMicrosite,
        userId: user?._id,
        postType: "poll",
        content: {
          question,
          options: uploadedOptions,
          allowMultiple,
          durationDays: durationDays ? Number(durationDays) : undefined,
          durationHours: durationHours ? Number(durationHours) : undefined,
          durationMinutes: durationMinutes
            ? Number(durationMinutes)
            : undefined,
        },
      };

      const response = await postFeed(payload, accessToken || "");

      if (response?.state === "success") {
        toast.success("Poll Created Successfully", { position: "top-right" });
        setIsCreatePollModalOpen(false);
        closeModal();
        router.push("/?tab=feed");
      } else {
        toast.error("Something Went Wrong!", { position: "top-right" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create poll", { position: "top-right" });
    } finally {
      setIsCreatePollLoading(false);
    }
  };

  return (
    <Card className="border-0 rounded-none">
      <CardContent className="space-y-4 p-6 pt-2">
        {/* Question */}
        <div>
          <label className="text-sm text-gray-500">Question</label>
          <Input
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Options */}
        <div>
          <label className="text-sm text-gray-500 mb-2 block">Options</label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {/* Image upload button / preview */}
                  <div className="relative flex-shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => {
                        fileInputRefs.current[idx] = el;
                      }}
                      onChange={(e) => handleImageChange(idx, e)}
                    />
                    {opt.image ? (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200">
                        <Image
                          src={opt.image}
                          alt={`Option ${idx + 1} image`}
                          fill
                          className="object-cover"
                        />
                        {/* Remove image button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <X size={14} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleImageClick(idx)}
                        className="w-10 h-10 rounded-lg border border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-colors"
                      >
                        <ImagePlus size={16} className="text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Text input */}
                  <Input
                    placeholder={`Option ${idx + 1}`}
                    value={opt.text}
                    onChange={(e) =>
                      handleOptionTextChange(idx, e.target.value)
                    }
                    className="flex-1"
                  />

                  {/* Remove option button — only show if more than 2 options */}
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Image preview label if image is selected */}
                {opt.image && (
                  <p className="text-xs text-gray-400 pl-12">
                    Image attached · click to remove
                  </p>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            className="w-full mt-2 bg-slate-50"
            onClick={addOption}
            disabled={options.length >= 6}
          >
            + Add Option {options.length >= 6 && "(max 6)"}
          </Button>
        </div>

        {/* Allow multiple answers */}
        <div className="flex justify-between items-center border-t pt-4">
          <span className="text-gray-700 text-sm">Allow multiple answers</span>
          <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
        </div>

        {/* Duration */}
        <div className="border-t pt-4">
          <label className="text-sm text-gray-500 block mb-3">
            Poll length
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* Days */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Days</label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer appearance-none"
              >
                {Array.from({ length: 8 }, (_, i) => (
                  <option key={i} value={i}>
                    {i} {i === 1 ? "Day" : "Days"}
                  </option>
                ))}
              </select>
            </div>

            {/* Hours */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Hours</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer appearance-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i} {i === 1 ? "Hour" : "Hours"}
                  </option>
                ))}
              </select>
            </div>

            {/* Minutes */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Minutes</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer appearance-none"
              >
                {[0, 5, 10, 15, 20, 25, 30, 45].map((m) => (
                  <option key={m} value={m}>
                    {m} {m === 1 ? "Minute" : "Minutes"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Total duration preview */}
          {(Number(durationDays) > 0 ||
            Number(durationHours) > 0 ||
            Number(durationMinutes) > 0) && (
            <p className="text-xs text-gray-400 mt-2">
              Poll will run for{" "}
              {[
                Number(durationDays) > 0 &&
                  `${durationDays} ${Number(durationDays) === 1 ? "day" : "days"}`,
                Number(durationHours) > 0 &&
                  `${durationHours} ${Number(durationHours) === 1 ? "hour" : "hours"}`,
                Number(durationMinutes) > 0 &&
                  `${durationMinutes} ${Number(durationMinutes) === 1 ? "minute" : "minutes"}`,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>

        {/* Submit */}
        <Button
          className="w-full bg-black text-white rounded-xl mt-4"
          onClick={handleSubmit}
          disabled={isCreatePollLoading}
        >
          {isCreatePollLoading ? (
            <Loader className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            "Create Poll"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
