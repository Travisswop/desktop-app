function copyTextWithTextarea(text: string): boolean {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
}

export async function copyTextToClipboard(
  text?: string | null,
): Promise<boolean> {
  if (!text) return false;

  try {
    if (copyTextWithTextarea(text)) return true;
  } catch {
    // Fall through to the Clipboard API below.
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard can be denied in embedded browsers or permission-limited contexts.
  }

  return false;
}

export function installClipboardWriteFallback() {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard?.writeText
  ) {
    return;
  }

  const clipboard = navigator.clipboard as Clipboard & {
    __swopCopyFallbackInstalled?: boolean;
  };

  if (clipboard.__swopCopyFallbackInstalled) return;

  const nativeWriteText = clipboard.writeText.bind(clipboard);
  const writeTextWithFallback = async (text: string) => {
    try {
      if (copyTextWithTextarea(String(text))) return;
    } catch {
      // Fall back to the native API below.
    }

    await nativeWriteText(text);
  };

  try {
    Object.defineProperty(clipboard, 'writeText', {
      configurable: true,
      value: writeTextWithFallback,
    });
    clipboard.__swopCopyFallbackInstalled = true;
  } catch {
    try {
      clipboard.writeText = writeTextWithFallback;
      clipboard.__swopCopyFallbackInstalled = true;
    } catch {
      // Some browsers lock the Clipboard object; app-level copy buttons still use
      // copyTextToClipboard directly.
    }
  }
}
