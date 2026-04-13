export const CommentSkeleton: any = () => (
  <div className="flex flex-col gap-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 flex flex-col gap-2 pt-1">
          {/* name + time */}
          <div className="flex items-center gap-2">
            <div className="h-3 w-24 bg-gray-200 rounded-full" />
            <div className="h-3 w-10 bg-gray-100 rounded-full" />
          </div>
          {/* text lines — varied width feels natural */}
          <div className="h-3 w-full bg-gray-200 rounded-full" />
          <div className="h-3 w-4/5 bg-gray-200 rounded-full" />
          <div className="h-3 w-3/5 bg-gray-100 rounded-full" />
          {/* reaction row */}
          <div className="w-full flex items-center justify-between gap-4 mt-1">
            <div className="h-3 w-10 bg-gray-200 rounded-full" />
            <div className="h-3 w-10 bg-gray-200 rounded-full" />
            <div className="h-3 w-10 bg-gray-200 rounded-full" />
            <div className="h-3 w-10 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);
