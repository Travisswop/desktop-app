export interface AuthorStreak {
  result: 'W' | 'L';
  count: number;
  label: string;
  kind: 'win' | 'loss';
}

export default function AuthorStreakBadge({
  streak,
  compact = false,
}: {
  streak?: AuthorStreak | null;
  compact?: boolean;
}) {
  if (!streak || streak.count < 1) return null;
  const isWin = streak.result === 'W';
  return (
    <span
      aria-label={`${streak.count} ${isWin ? 'win' : 'loss'} streak`}
      className={`inline-flex shrink-0 items-center rounded-full border font-mono font-black uppercase tracking-[0.08em] ${
        compact ? 'h-6 gap-1 px-2 text-[9px]' : 'h-7 gap-1.5 px-2.5 text-[10px]'
      } ${
        isWin
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-600'
      }`}
    >
      <span aria-hidden="true">{isWin ? '🔥' : '❄️'}</span>
      {streak.label} streak
    </span>
  );
}
