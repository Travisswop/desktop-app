'use client';

import { useEffect, useRef } from 'react';

import {
  emitLocalConsoleCardTelemetry,
  shouldEmitLocalConsoleCardRehydratedOnMount,
  type LocalConsoleCardType,
} from '@/lib/chat/localConsoleCardTelemetry';

export function LocalConsoleCardTelemetryBeacon({
  cardType,
  sourceMessageId,
  isGroup,
  historyBackedAtMount = true,
}: {
  cardType: LocalConsoleCardType;
  sourceMessageId: string;
  isGroup: boolean;
  historyBackedAtMount?: boolean;
}) {
  const shouldEmitOnMountRef = useRef(
    shouldEmitLocalConsoleCardRehydratedOnMount({
      historyBackedAtMount,
    })
  );

  useEffect(() => {
    if (!sourceMessageId || !shouldEmitOnMountRef.current) return;
    emitLocalConsoleCardTelemetry({
      eventType: 'rehydrated',
      cardType,
      sourceMessageId,
      threadType: isGroup ? 'group' : 'direct',
    });
  }, [cardType, isGroup, sourceMessageId]);

  return null;
}
