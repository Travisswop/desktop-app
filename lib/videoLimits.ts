'use client';

import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

// Plan-based media caps: video length (2 minutes Free / 30 minutes Premium)
// and upload size (maxUploadMb). The numbers come from the backend
// entitlements payload so every surface (desktop, mobile, feed, SmartSite
// media) agrees.
const FREE_FALLBACK_SECONDS = 120;
const FREE_FALLBACK_UPLOAD_MB = 100;
const CACHE_MS = 5 * 60 * 1000;

type MediaFeatures = { maxVideoSeconds: number; maxUploadMb: number };

let cached: { value: MediaFeatures; at: number } | null = null;

async function getMediaFeatures(): Promise<MediaFeatures> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const value: MediaFeatures = {
    maxVideoSeconds: FREE_FALLBACK_SECONDS,
    maxUploadMb: FREE_FALLBACK_UPLOAD_MB,
  };
  try {
    const token = Cookies.get('access-token');
    if (token) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/subscription/entitlements`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await res.json();
      const features = body?.data?.features || {};
      // null = unlimited for either cap.
      for (const key of ['maxVideoSeconds', 'maxUploadMb'] as const) {
        const fromServer = features[key];
        if (typeof fromServer === 'number' && fromServer > 0) value[key] = fromServer;
        if (fromServer === null) value[key] = Number.POSITIVE_INFINITY;
      }
    }
  } catch {
    // Signed out / offline — enforce the free caps rather than blocking.
  }
  cached = { value, at: Date.now() };
  return value;
}

export async function getMaxVideoSeconds(): Promise<number> {
  return (await getMediaFeatures()).maxVideoSeconds;
}

export async function getMaxUploadMb(): Promise<number> {
  return (await getMediaFeatures()).maxUploadMb;
}

export function getVideoDurationSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    // The browser can fire NEITHER loadedmetadata NOR error (codecs it can't
    // probe, media loading deferred in background/occluded tabs) — without a
    // deadline the caller's await hangs forever and the upload dies silently
    // before any spinner or toast. Null = unreadable = let it through.
    const settle = (value: number | null) => {
      clearTimeout(deadline);
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const deadline = setTimeout(() => settle(null), 5000);
    video.preload = 'metadata';
    video.onloadedmetadata = () =>
      settle(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => settle(null);
    video.src = url;
  });
}

/**
 * Drop files that exceed the plan's caps — videos longer than the plan
 * allows, or any media over the plan's upload size — and toast a clear
 * reason when something was dropped.
 */
export async function filterVideoFilesByPlan(files: File[]): Promise<File[]> {
  const { maxVideoSeconds, maxUploadMb } = await getMediaFeatures();
  const allowed: File[] = [];
  let droppedTooLong = 0;
  let droppedTooBig = 0;
  for (const file of files) {
    if (file.size > maxUploadMb * 1024 * 1024) {
      droppedTooBig += 1;
      continue;
    }
    if (!file.type.startsWith('video/')) {
      allowed.push(file);
      continue;
    }
    const duration = await getVideoDurationSeconds(file);
    // Unreadable metadata → let it through; the cap is a product limit, not
    // a security boundary.
    if (duration !== null && duration > maxVideoSeconds) {
      droppedTooLong += 1;
      continue;
    }
    allowed.push(file);
  }
  if (droppedTooLong > 0) {
    const minutes = Math.round(maxVideoSeconds / 60);
    toast.error(
      `Videos can be up to ${minutes} minute${minutes === 1 ? '' : 's'} on your plan. Upgrade to Premium for 30-minute videos.`
    );
  }
  if (droppedTooBig > 0) {
    toast.error(
      Number.isFinite(maxUploadMb)
        ? `Files can be up to ${maxUploadMb} MB on your plan.`
        : 'That file is too large to upload.'
    );
  }
  return allowed;
}
