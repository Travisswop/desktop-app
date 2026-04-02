"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { BsEmojiSmile } from "react-icons/bs";
import { FiImage } from "react-icons/fi";
import EmojiPicker from "emoji-picker-react";
import isUrl from "@/lib/isUrl";

interface CommentInputProps {
  postId: string;
  accessToken: string;
  latestCommentCount: number;
  setLatestCommentCount: (count: number) => void;
  onCommentSubmitted: (newTotal: number) => void;
  parentCommentId?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
  currentUserAvatar?: string | null;
  onCancel?: () => void;
  compact?: boolean; // for inline reply mode (no avatar shown)
}

export default function CommentInput({
  postId,
  accessToken,
  latestCommentCount,
  setLatestCommentCount,
  onCommentSubmitted,
  parentCommentId = null,
  placeholder,
  autoFocus = false,
  currentUserAvatar,
  onCancel,
  compact = false,
}: CommentInputProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const MAX_LENGTH = 512;

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  // Auto-grow
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length > MAX_LENGTH) return;
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const handleSubmit = async () => {
    if (!text.trim() || submitting || !accessToken) return;
    setSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/${postId}/comment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: text.trim(),
            ...(parentCommentId ? { parentCommentId } : {}),
          }),
        },
      );
      const json = await res.json();

      if (json?.success) {
        const newCount = latestCommentCount + 1;
        setLatestCommentCount(newCount);
        onCommentSubmitted(json?.comment || null);
        setText("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      console.error("Comment submit failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
    if (e.key === "Escape" && onCancel) onCancel();
  };

  const remaining = MAX_LENGTH - text.length;
  const isNearLimit = remaining <= 50;

  return (
    <div className="flex-1 flex flex-col">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={
          placeholder ||
          (parentCommentId ? "Write your reply…" : "Post your reply…")
        }
        rows={compact ? 1 : 2}
        autoFocus={autoFocus}
        className="w-full text-[15px] text-gray-900 placeholder:text-gray-400 resize-none outline-none bg-transparent leading-relaxed min-h-[40px] max-h-40"
      />

      {/* Bottom bar — only visible when focused / has text */}
      {(text.length > 0 || !compact) && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          {/* Toolbar */}
          <div className="flex items-center gap-1 relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((p) => !p)}
              className="p-1.5 rounded-full text-blue-400 hover:bg-blue-50 transition-colors"
            >
              <BsEmojiSmile size={18} />
            </button>

            {showEmojiPicker && (
              <div ref={emojiRef} className="absolute bottom-8 left-0 z-[9999]">
                <EmojiPicker
                  onEmojiClick={(obj) =>
                    setText((p) => {
                      if (p.length >= MAX_LENGTH) return p;
                      return p + obj.emoji;
                    })
                  }
                  width={300}
                  height={350}
                />
              </div>
            )}
          </div>

          {/* Right: char count + submit */}
          <div className="flex items-center gap-3">
            {text.length > 0 && (
              <span
                className={`text-xs tabular-nums ${
                  isNearLimit ? "text-orange-400" : "text-gray-300"
                }`}
              >
                {remaining}
              </span>
            )}

            {onCancel && (
              <button
                onClick={onCancel}
                className="text-sm text-gray-400 hover:text-gray-600 font-medium px-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="flex items-center gap-1.5 bg-black hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-1.5 rounded-full transition-all"
            >
              {submitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : null}
              {parentCommentId ? "Reply" : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
