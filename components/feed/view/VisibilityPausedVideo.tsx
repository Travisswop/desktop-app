"use client";

import React, { useEffect, useRef, type VideoHTMLAttributes } from "react";

type VisibilityPausedVideoProps = VideoHTMLAttributes<HTMLVideoElement>;

type PauseableVideo = Pick<HTMLVideoElement, "pause" | "paused">;
type VisibilityEntry = Pick<IntersectionObserverEntry, "isIntersecting">;

export function pauseVideoWhenOutsideViewport(
  video: PauseableVideo,
  entry: VisibilityEntry,
) {
  if (!entry.isIntersecting && !video.paused) {
    video.pause();
  }
}

export default function VisibilityPausedVideo(
  props: VisibilityPausedVideoProps,
) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        pauseVideoWhenOutsideViewport(video, entry);
      },
      { threshold: 0 },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  return <video ref={videoRef} {...props} />;
}
