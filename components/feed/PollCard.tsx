"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@nextui-org/react";
import { AddPollVote } from "@/actions/postFeed";
import { useUser } from "@/lib/UserContext";

interface PollCardProps {
  poll: any;
  userId: string;
  token: string;
  onVoteSuccess?: (updatedPoll: any) => void;
}

export default function PollCard({
  poll,
  userId,
  token,
  onVoteSuccess,
}: PollCardProps) {
  const { accessToken } = useUser();

  const [localPoll, setLocalPoll] = useState(poll?.content || {});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);

  // find which option the user has voted for (if any)
  const userPreviousVote = localPoll?.options?.findIndex((opt: any) =>
    opt.voters?.includes(userId)
  );

  const totalVotes =
    localPoll?.options?.reduce(
      (acc: number, o: any) => acc + (o.votes || 0),
      0
    ) || 0;

  const handleVote = async (optionIndex: number) => {
    if (localPoll?.isExpired || voting) return;

    setVoting(true);
    setSelectedOption(optionIndex);

    // ⚡ Optimistic update
    const updatedPoll = { ...localPoll, options: [...localPoll.options] };

    // 1️⃣ Remove previous vote if exists
    if (userPreviousVote !== -1 && userPreviousVote !== optionIndex) {
      const prevOpt = updatedPoll.options[userPreviousVote];
      prevOpt.votes = Math.max((prevOpt.votes || 1) - 1, 0);
      prevOpt.voters = prevOpt.voters?.filter(
        (v: string) => v.toString() !== userId.toString()
      );
    }

    // 2️⃣ Add new vote
    const selectedOpt = updatedPoll.options[optionIndex];
    if (!selectedOpt.voters?.includes(userId)) {
      selectedOpt.votes = (selectedOpt.votes || 0) + 1;
      selectedOpt.voters = [...(selectedOpt.voters || []), userId];
    }

    // 3️⃣ Add user to totalVoters if first time voting
    if (!updatedPoll.totalVoters?.includes(userId)) {
      updatedPoll.totalVoters = [...(updatedPoll.totalVoters || []), userId];
    }

    setLocalPoll(updatedPoll);

    try {
      const payload = {
        pollId: poll._id,
        optionIndex,
        userId,
      };
      const data = await AddPollVote(payload, accessToken || token || "");

      if (data.state === "success") {
        setLocalPoll(data.data.content || updatedPoll);
        onVoteSuccess?.(data.data);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while voting.");
      setLocalPoll(poll.content); // rollback
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="border rounded-2xl bg-gray-50 p-4 mt-2 transition-all">
      <h3 className="font-semibold text-gray-800 text-base">
        {localPoll?.question}
      </h3>

      <div className="mt-3 flex flex-col gap-2">
        {localPoll?.options?.map((option: any, index: number) => {
          const percent =
            totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const userSelected = userPreviousVote === index;

          return (
            <button
              key={index}
              disabled={localPoll?.isExpired || voting}
              onClick={() => handleVote(index)}
              className={cn(
                "w-full text-left border rounded-xl p-2 text-sm relative group transition-all duration-200",
                userSelected
                  ? "bg-blue-100 border-blue-400"
                  : "hover:bg-gray-100 active:scale-[0.98]"
              )}
            >
              <div className="flex justify-between items-center">
                <p className="font-medium text-gray-700">{option.text}</p>
                <p className="text-xs text-gray-600 font-medium">{percent}%</p>
              </div>

              <div className="mt-1">
                <Progress
                  value={percent}
                  color={userSelected ? "primary" : "default"}
                  className="h-2 rounded-full"
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 text-xs text-gray-500 flex justify-between">
        <p>{totalVotes} total votes</p>
        {localPoll?.isExpired ? (
          <p className="text-red-500 font-medium">Expired</p>
        ) : (
          <p>
            Expires at:{" "}
            {new Date(localPoll.expiresAt).toLocaleString(undefined, {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        )}
      </div>

      {localPoll?.allowMultiple && (
        <p className="mt-1 text-[11px] text-gray-400 italic">
          Multiple answers allowed
        </p>
      )}
    </div>
  );
}
