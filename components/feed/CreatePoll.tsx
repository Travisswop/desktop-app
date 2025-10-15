"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";

export default function CreatePoll() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [durationDays, setDurationDays] = useState<number | "">("");
  const [durationHours, setDurationHours] = useState<number | "">("");

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => setOptions([...options, ""]);

  const removeEmptyOptions = () => {
    setOptions(options.filter((opt) => opt.trim() !== ""));
  };

  const handleSubmit = async () => {
    removeEmptyOptions();
    if (!question.trim() || options.length < 2) {
      alert("Please enter a question and at least 2 options.");
      return;
    }

    const payload = {
      postType: "poll",
      content: {
        question,
        options,
        allowMultiple,
        durationDays: durationDays ? Number(durationDays) : undefined,
        durationHours: durationHours ? Number(durationHours) : undefined,
      },
    };

    console.log("📤 Submitting poll:", payload);

    // Example POST
    // await fetch("/api/feed", { method: "POST", body: JSON.stringify(payload) });
  };

  return (
    <div className="">
      <Card className="border-0 rounded-none">
        <CardContent className="space-y-4 p-6">
          {/* Header */}
          {/* <div className="flex justify-between items-center">
            <button className="text-gray-400 text-sm">Cancel</button>
            <h2 className="font-semibold text-lg">Create Poll</h2>
            <button
              onClick={handleSubmit}
              className="text-blue-600 text-sm font-medium"
            >
              Create
            </button>
          </div> */}

          {/* Question */}
          <div>
            <label className="text-sm text-gray-500">Question</label>
            <Input
              placeholder="Ask Question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-sm text-gray-500">Option</label>
            {options.map((opt, idx) => (
              <Input
                key={idx}
                placeholder="Add"
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                className="mt-1"
              />
            ))}
            <Button
              variant="ghost"
              className="w-full mt-2 bg-slate-50"
              onClick={addOption}
            >
              + Add Option
            </Button>
          </div>

          {/* Allow multiple answers */}
          <div className="flex justify-between items-center border-t pt-4">
            <span className="text-gray-700 text-sm">
              Allow multiple answers
            </span>
            <Switch
              checked={allowMultiple}
              onCheckedChange={setAllowMultiple}
            />
          </div>

          {/* Expiration */}
          <div className="grid grid-cols-2 gap-3 border-t pt-4">
            <div>
              <label className="text-sm text-gray-500">Duration (Days)</label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.valueAsNumber || "")}
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">Duration (Hours)</label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.valueAsNumber || "")}
              />
            </div>
          </div>

          {/* Continue button */}
          <Button
            className="w-full bg-gray-100 text-gray-700 hover:text-white rounded-xl mt-4"
            onClick={handleSubmit}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
