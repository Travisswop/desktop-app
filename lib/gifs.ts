import type { GifProvider } from 'gif-picker-react';
import { ContentFilter, Klipy } from 'gif-picker-react/providers/klipy';

const klipyApiKey = process.env.NEXT_PUBLIC_KLIPY_API_KEY?.trim() ?? '';

export const gifPickerEnabled = klipyApiKey.length > 0;

export const gifProvider: GifProvider | null = gifPickerEnabled
  ? Klipy(klipyApiKey, {
      contentFilter: ContentFilter.LOW,
      locale: 'en_US',
      showBranding: true,
    })
  : null;
