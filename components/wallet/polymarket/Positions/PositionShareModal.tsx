'use client';

import { useRef, useState } from 'react';
import { X, Info, Download } from 'lucide-react';
import type { PolymarketPosition } from '@/hooks/polymarket';

interface PositionShareModalProps {
  position: PolymarketPosition;
  isOpen: boolean;
  onClose: () => void;
}

/** Convert a decimal price (0–1) to American odds string e.g. "+459" or "-178" */
function toAmericanOdds(price: number): string {
  if (price <= 0 || price >= 1) return 'N/A';
  if (price >= 0.5) {
    return `-${Math.round((price / (1 - price)) * 100)}`;
  }
  return `+${Math.round(((1 - price) / price) * 100)}`;
}

async function captureTicket(el: HTMLElement): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(el, {
    backgroundColor: '#ffffff',
    scale: 3,
    useCORS: true,
    logging: false,
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to capture ticket'));
    }, 'image/png');
  });
}

export default function PositionShareModal({
  position,
  isOpen,
  onClose,
}: PositionShareModalProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  if (!isOpen) return null;

  const pnl = position.cashPnl;
  const isProfitable = pnl >= 0;
  const pnlLabel = isProfitable ? 'Gain' : 'Loss';
  const cost = position.initialValue || position.avgPrice * position.size;
  const toWin = position.size;
  const avgOdds = toAmericanOdds(position.avgPrice);
  const curOdds = toAmericanOdds(position.curPrice);

  const getBlob = async (): Promise<Blob | null> => {
    if (!ticketRef.current) return null;
    setIsCapturing(true);
    try {
      return await captureTicket(ticketRef.current);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleNativeShare = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], 'swop-pick.png', { type: 'image/png' });
    const shareText = `I picked ${position.outcome} on "${position.title}" — ${isProfitable ? `up +$${Math.abs(pnl).toFixed(2)}` : `down -$${Math.abs(pnl).toFixed(2)}`} via @swop_id`;

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: position.title,
        text: shareText,
        files: [file],
      });
    } else if (navigator.share) {
      // Fallback: share without image
      await navigator.share({
        title: position.title,
        text: shareText,
        url: `https://polymarket.com/event/${position.eventSlug}`,
      });
    } else {
      // Last resort: download image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'swop-pick.png';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleShareX = async () => {
    const blob = await getBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'swop-pick.png';
      a.click();
      URL.revokeObjectURL(url);
    }
    const text = `I picked ${position.outcome} on "${position.title}" — ${isProfitable ? `up +$${Math.abs(pnl).toFixed(2)}` : `down -$${Math.abs(pnl).toFixed(2)}`} via @swop_id`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank',
    );
  };

  const handleShareInstagram = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'swop-pick.png';
    a.click();
    URL.revokeObjectURL(url);
    // Open Instagram after download so user can attach manually
    setTimeout(() => window.open('https://www.instagram.com/', '_blank'), 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-[340px] mx-4 shadow-2xl overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close + header */}
        <div className="relative flex items-center justify-center pt-5 pb-4 px-5">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>

          {/* Diamond icon + label */}
          <div className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="text-gray-500"
            >
              <path
                d="M8 1L1 6l7 9 7-9-7-5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-semibold text-gray-600 tracking-wide">
              Position
            </span>
          </div>
        </div>

        {/* ── Ticket (captured as image) ── */}
        <div ref={ticketRef} className="bg-white px-6 pb-5">
          {/* SWOP branding */}
          <div className="text-center mb-5">
            <p className="text-2xl font-black text-gray-900 uppercase">
              SWOP
            </p>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2 leading-snug">
              {position.title}
            </p>
          </div>

          {/* You bought badge */}
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <span className="text-base font-medium text-gray-700">
              You bought
            </span>
            <div className="flex items-center gap-1.5 border border-gray-200 bg-white rounded-xl px-3 py-1.5 shadow-sm">
              {position.icon ? (
                <img
                  src={position.icon}
                  alt={position.outcome}
                  className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-blue-600">
                    {position.outcome.slice(0, 1)}
                  </span>
                </div>
              )}
              <span className="text-sm font-bold text-gray-900">
                {position.outcome}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{pnlLabel}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold ${isProfitable ? 'text-green-600' : 'text-gray-900'}`}
                >
                  {isProfitable ? '+' : '-'}$
                  {Math.abs(pnl).toFixed(2)}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
                    isProfitable
                      ? 'bg-green-50 text-green-600 border-green-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {isProfitable ? '+' : ''}
                  {position.percentPnl.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Cost</span>
              <span className="text-sm font-semibold text-gray-900">
                ${cost.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Odds</span>
              <span className="text-sm font-semibold text-gray-900">
                <span className="text-gray-400">{avgOdds}</span>
                <span className="text-gray-300 mx-1.5">→</span>
                <span>{curOdds}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-400">To win</span>
                <Info className="w-3.5 h-3.5 text-gray-300" />
              </div>
              <span className="text-sm font-bold text-gray-900">
                ${Math.round(toWin)}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket-style notch divider */}
        <div className="relative flex items-center px-3">
          <div className="w-5 h-5 rounded-full bg-gray-100 flex-shrink-0 -ml-3" />
          <div className="flex-1 border-t border-dashed border-gray-200 mx-1" />
          <div className="w-5 h-5 rounded-full bg-gray-100 flex-shrink-0 -mr-3" />
        </div>

        {/* Share buttons */}
        <div className="px-6 py-5 flex items-center justify-center gap-6">
          {/* Instagram — downloads image then opens Instagram */}
          <button
            onClick={handleShareInstagram}
            disabled={isCapturing}
            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors"
            title="Share on Instagram"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-gray-700"
              fill="currentColor"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </button>

          {/* X — downloads image + opens tweet */}
          <button
            onClick={handleShareX}
            disabled={isCapturing}
            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors"
            title="Share on X"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-gray-700"
              fill="currentColor"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>

          {/* Native share (with image file) */}
          <button
            onClick={handleNativeShare}
            disabled={isCapturing}
            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors"
            title="Share"
          >
            {isCapturing ? (
              <svg className="animate-spin w-5 h-5 text-gray-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
