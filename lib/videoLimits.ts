'use client';

import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

// Plan-based video length caps: 2 minutes on Free, 30 minutes on Premium.
// The numbers come from the backend entitlements payload so every surface
// (desktop, mobile, feed, SmartSite media) agrees.
const FREE_FALLBACK_SECONDS = 120;
const CACHE_MS = 5 * 60 * 1000;

let cached: { value: number; at: number } | null = null;

export async function getMaxVideoSeconds(): Promise<number> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  let value = FREE_FALLBACK_SECONDS;
  try {
    const token = Cookies.get('access-token');
    if (token) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/subscription/entitlements`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await res.json();
      const fromServer = body?.data?.features?.maxVideoSeconds;
      if (typeof fromServer === 'number' && fromServer > 0) value = fromServer;
      if (fromServer === null) value = Number.POSITIVE_INFINITY;
    }
  } catch {
    // Signed out / offline — enforce the free cap rather than blocking.
  }
  cached = { value, at: Date.now() };
  return value;
}

export function getVideoDurationSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

/**
 * Drop videos longer than the plan allows (images pass through untouched)
 * and toast an upgrade prompt when something was dropped.
 */
export async function filterVideoFilesByPlan(files: File[]): Promise<File[]> {
  const cap = await getMaxVideoSeconds();
  const allowed: File[] = [];
  let dropped = 0;
  for (const file of files) {
    if (!file.type.startsWith('video/')) {
      allowed.push(file);
      continue;
    }
    const duration = await getVideoDurationSeconds(file);
    // Unreadable metadata → let it through; the cap is a product limit, not
    // a security boundary.
    if (duration !== null && duration > cap) {
      dropped += 1;
      continue;
    }
    allowed.push(file);
  }
  if (dropped > 0) {
    const minutes = Math.round(cap / 60);
    toast.error(
      `Videos can be up to ${minutes} minute${minutes === 1 ? '' : 's'} on your plan. Upgrade to Premium for 30-minute videos.`
    );
  }
  return allowed;
}
