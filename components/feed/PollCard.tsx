"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@nextui-org/react";
import { AddPollVote } from "@/actions/postFeed";
import { useUser } from "@/lib/UserContext";
import toast from "react-hot-toast";
import { isTimeExpired } from "@/lib/isTimeExpired";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import isUrl from "@/lib/isUrl";

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
  const [voting, setVoting] = useState(false);

  console.log("poll", poll);
  console.log("localPoll", localPoll);

  // Get all options the user has voted for
  const getUserVotedOptions = () => {
    return (
      localPoll?.options
        ?.map((opt: any, idx: number) =>
          opt.voters?.includes(userId) ? idx : -1
        )
        .filter((idx: number) => idx !== -1) || []
    );
  };

  const userVotedOptions = getUserVotedOptions();

  const totalVotes =
    localPoll?.options?.reduce(
      (acc: number, o: any) => acc + (o.votes || 0),
      0
    ) || 0;

  const handleVote = async (optionIndex: number) => {
    if (localPoll?.isExpired || isTimeExpired(localPoll.expiresAt) || voting)
      return;

    setVoting(true);

    const updatedPoll = { ...localPoll, options: [...localPoll.options] };

    if (localPoll?.allowMultiple) {
      // Multiple vote mode: toggle the selected option
      const selectedOpt = updatedPoll.options[optionIndex];
      const hasVoted = selectedOpt.voters?.includes(userId);

      if (hasVoted) {
        // Remove vote
        selectedOpt.votes = Math.max((selectedOpt.votes || 1) - 1, 0);
        selectedOpt.voters = selectedOpt.voters?.filter(
          (v: string) => v.toString() !== userId.toString()
        );

        // Remove from totalVoters if user has no more votes
        const stillHasVotes = updatedPoll.options.some(
          (opt: any, idx: number) =>
            idx !== optionIndex && opt.voters?.includes(userId)
        );
        if (!stillHasVotes) {
          updatedPoll.totalVoters = updatedPoll.totalVoters?.filter(
            (v: string) => v.toString() !== userId.toString()
          );
        }
      } else {
        // Add vote
        selectedOpt.votes = (selectedOpt.votes || 0) + 1;
        selectedOpt.voters = [...(selectedOpt.voters || []), userId];

        // Add user to totalVoters if first time voting
        if (!updatedPoll.totalVoters?.includes(userId)) {
          updatedPoll.totalVoters = [
            ...(updatedPoll.totalVoters || []),
            userId,
          ];
        }
      }
    } else {
      // Single vote mode: replace previous vote
      const userPreviousVote = localPoll?.options?.findIndex((opt: any) =>
        opt.voters?.includes(userId)
      );

      // Remove previous vote if exists
      if (userPreviousVote !== -1 && userPreviousVote !== optionIndex) {
        const prevOpt = updatedPoll.options[userPreviousVote];
        prevOpt.votes = Math.max((prevOpt.votes || 1) - 1, 0);
        prevOpt.voters = prevOpt.voters?.filter(
          (v: string) => v.toString() !== userId.toString()
        );
      }

      // Add new vote
      const selectedOpt = updatedPoll.options[optionIndex];
      if (!selectedOpt.voters?.includes(userId)) {
        selectedOpt.votes = (selectedOpt.votes || 0) + 1;
        selectedOpt.voters = [...(selectedOpt.voters || []), userId];
      }

      // Add user to totalVoters if first time voting
      if (!updatedPoll.totalVoters?.includes(userId)) {
        updatedPoll.totalVoters = [...(updatedPoll.totalVoters || []), userId];
      }
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
        toast.error(data.message);
        setLocalPoll(poll.content); // rollback
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while voting.");
      setLocalPoll(poll.content); // rollback
    } finally {
      setVoting(false);
    }
  };

  const totalVotersData = localPoll?.totalVotersData || [];

  return (
    <div className="border rounded-2xl bg-gray-50 p-4 mt-2 transition-all">
      <h3 className="font-semibold text-gray-800 text-base">
        {localPoll?.question}
      </h3>

      <div className="mt-3 flex flex-col gap-2">
        {localPoll?.options?.map((option: any, index: number) => {
          const percent =
            totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const userSelected = userVotedOptions.includes(index);

          return (
            <button
              key={index}
              disabled={
                localPoll?.isExpired ||
                isTimeExpired(localPoll.expiresAt) ||
                voting
              }
              onClick={() => handleVote(index)}
              className={cn(
                "w-full text-left border rounded-xl p-2 text-sm relative group transition-all duration-200",
                userSelected
                  ? "bg-blue-100 border-blue-400"
                  : "hover:bg-gray-100 active:scale-[0.98]",
                (localPoll?.isExpired || isTimeExpired(localPoll.expiresAt)) &&
                  "opacity-60 cursor-not-allowed"
              )}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {localPoll?.allowMultiple && (
                    <div
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                        userSelected
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-400"
                      )}
                    >
                      {userSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                  )}
                  <p className="font-medium text-gray-700">{option.text}</p>
                </div>
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
      <div className="mt-3 text-xs text-gray-500 flex justify-between items-center">
        {/* Voters Tooltip */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => e.preventDefault()}
                disabled={poll && poll.userId !== userId}
                className="hover:text-gray-700 transition-colors font-medium"
              >
                {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
              </button>
            </TooltipTrigger>
            {poll && poll.userId === userId && (
              <TooltipContent
                side="bottom"
                align="start"
                className="w-72 p-0 shadow-xl border-gray-200"
              >
                {totalVotersData.length > 0 ? (
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        Voters
                      </h4>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {totalVotersData.length}
                      </span>
                    </div>

                    <ScrollArea className="h-48 pr-3">
                      <div className="space-y-1">
                        {totalVotersData.map((voter: any, idx: number) => (
                          <div
                            // href={`/sp/${voter._id}`}
                            key={voter._id || idx}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <Avatar className="h-9 w-9 border border-gray-200">
                              <AvatarImage
                                src={
                                  isUrl(voter.profilePic)
                                    ? voter.profilePic
                                    : `/images/user_avator/${voter.profilePic}@3x.png`
                                }
                                alt={voter.name}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xs font-semibold">
                                {voter.name?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {voter.name || "Anonymous"}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {voter.email || "No email"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : totalVotes > 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500">
                      No voter data available
                    </p>
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500">No votes yet</p>
                  </div>
                )}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {localPoll?.isExpired || isTimeExpired(localPoll.expiresAt) ? (
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
          ✓ Multiple answers allowed
        </p>
      )}
    </div>
  );
}
