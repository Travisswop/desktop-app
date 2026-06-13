'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import GifPicker, { Theme, type TenorImage } from 'gif-picker-react';
import {
  Camera,
  FileText,
  Gift,
  Image as ImageIcon,
  Plus,
  Send,
  X,
} from 'lucide-react';

export interface ChatAttachmentGif {
  url: string;
  width?: number;
  height?: number;
}

interface ChatAttachmentMenuProps {
  disabled?: boolean;
  onSendFiles: (files: File[]) => void;
  onSendGif: (gif: ChatAttachmentGif) => void;
  onTip: () => void;
}

const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY || '';

export default function ChatAttachmentMenu({
  disabled = false,
  onSendFiles,
  onSendGif,
  onTip,
}: ChatAttachmentMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'gif'>('menu');
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setView('menu');
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeMenu]);

  const handleFilesSelected = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      if (files.length === 0) return;
      closeMenu();
      onSendFiles(files);
    },
    [closeMenu, onSendFiles]
  );

  const handleGifClick = useCallback(
    (gif: TenorImage) => {
      closeMenu();
      onSendGif({
        url: gif.url,
        width: gif.width,
        height: gif.height,
      });
    },
    [closeMenu, onSendGif]
  );

  const menuItems = [
    {
      key: 'camera',
      label: 'Camera',
      hint: 'capture a photo',
      icon: Camera,
      onSelect: () => cameraInputRef.current?.click(),
    },
    {
      key: 'photos',
      label: 'Photos',
      hint: 'share an image or video',
      icon: ImageIcon,
      onSelect: () => photoInputRef.current?.click(),
    },
    {
      key: 'files',
      label: 'Files',
      hint: 'share a document',
      icon: FileText,
      onSelect: () => fileInputRef.current?.click(),
    },
    {
      key: 'tip',
      label: 'Tip',
      hint: 'send tokens with /send',
      icon: Send,
      onSelect: () => {
        closeMenu();
        onTip();
      },
    },
    {
      key: 'gif',
      label: 'Gif',
      hint: 'search Tenor gifs',
      icon: Gift,
      onSelect: () => setView('gif'),
    },
  ];

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFilesSelected}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      <button
        type="button"
        disabled={disabled}
        aria-label="Add attachment"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? closeMenu() : setIsOpen(true))}
        className={`dm-btn inline-flex h-9 w-9 items-center justify-center rounded-[12px] border transition-colors ${
          isOpen
            ? 'border-[#3fe08f]/45 bg-[#101217] text-[#3fe08f]'
            : 'border-white/[0.07] bg-[#050607] text-[#9396a0] hover:text-[#3fe08f]'
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Plus
          className={`h-[18px] w-[18px] transition-transform duration-150 ${
            isOpen ? 'rotate-45' : ''
          }`}
        />
      </button>

      {isOpen && view === 'menu' && (
        <div className="dm-rise absolute bottom-[calc(100%+18px)] left-0 z-30 w-[252px] rounded-[14px] border border-[#3fe08f]/20 bg-[#101217] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onSelect}
              className="dm-row flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left"
            >
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] border border-[#3fe08f]/20 bg-black text-[#3fe08f]">
                <item.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="dm-mono block text-[13px] font-bold text-[#eceef2]">
                  {item.label}
                </span>
                <span className="block truncate text-[11px] font-semibold text-[#737783]">
                  {item.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && view === 'gif' && (
        <div className="dm-rise absolute bottom-[calc(100%+18px)] left-0 z-30 w-[336px] overflow-hidden rounded-[14px] border border-[#3fe08f]/20 bg-[#101217] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <span className="dm-mono text-[12px] font-bold uppercase tracking-[0.08em] text-[#9396a0]">
              Pick a gif
            </span>
            <button
              type="button"
              aria-label="Close gif picker"
              onClick={closeMenu}
              className="dm-btn grid h-7 w-7 place-items-center rounded-[8px] border border-white/[0.07] bg-[#050607] text-[#9396a0] hover:text-[#eceef2]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {TENOR_API_KEY ? (
            <GifPicker
              onGifClick={handleGifClick}
              tenorApiKey={TENOR_API_KEY}
              theme={Theme.DARK}
              width="100%"
              height={360}
            />
          ) : (
            <div className="dm-mono px-4 py-6 text-center text-[12px] font-semibold text-[#737783]">
              Gif search is not configured. Set NEXT_PUBLIC_TENOR_API_KEY to
              enable it.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
