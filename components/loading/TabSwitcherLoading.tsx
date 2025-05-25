"use client";
import { Skeleton } from "@nextui-org/react";
import ConnectionLoading from "./ConnectionLoading";

export const TabSwitcherLoading = () => {
  return (
    <div className="shadow-none rounded-none overflow-hidden flex items-center gap-3">
      <Skeleton className="h-11 w-32 rounded" />
      <Skeleton className="h-11 w-32 rounded" />
      <Skeleton className="h-11 w-32 rounded" />
    </div>
  );
};

export const FeedMainComponentLoading = () => {
  return (
    <div className="flex h-screen w-3/5 bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Feed Content Skeleton */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Create Post Skeleton */}
          <div className="mb-8 p-4 border rounded-lg">
            <div className="flex items-center space-x-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>

          {/* Feed Items */}
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full rounded mb-2" />
                <Skeleton className="h-4 w-5/6 rounded mb-2" />
                <Skeleton className="h-4 w-4/6 rounded mb-4" />
                <Skeleton className="h-64 w-full rounded-lg mb-3" />
                <div className="flex space-x-4">
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export const FeedMainContentDataLoading = () => {
  return (
    <div className="w-full bg-background">
      <div className="space-y-6 w-full">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
            <Skeleton className="h-4 w-full rounded mb-2" />
            <Skeleton className="h-4 w-5/6 rounded mb-2" />
            <Skeleton className="h-4 w-4/6 rounded mb-4" />
            <Skeleton className="h-64 w-full rounded-lg mb-3" />
            <div className="flex space-x-4">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const FeedHomepageLoading = () => {
  return (
    <div className="flex gap-2">
      <FeedMainComponentLoading />
      <div className="flex-1 mt-6 flex flex-col gap-4 mx-4">
        <Skeleton className="flex rounded-lg w-32 h-6" />
        <Skeleton className="flex rounded-lg w-full h-8" />
        <ConnectionLoading />
      </div>
    </div>
  );
};
