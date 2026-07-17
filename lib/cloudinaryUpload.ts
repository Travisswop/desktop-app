import logger from '../utils/logger';

// Shared Cloudinary upload core for the unsigned `swopapp` preset.
//
// Uploads are sent as raw binary (File/Blob), never base64 — a base64 data
// URI inflates the request body by a third, and Cloudinary's edge rejects
// bodies over ~110MB with an HTML 413 page that the old per-type helpers
// crashed on trying to `.json()`. Legacy callers that still hold a data URI
// are converted back to binary here before sending.
//
// Files above CHUNK_THRESHOLD go through Cloudinary's chunked-upload
// protocol (same endpoint, sequential requests carrying `X-Unique-Upload-Id`
// and `Content-Range`; intermediate responses are `{done:false}` and the
// final chunk's response is the asset). That is what lets Premium's larger
// videos (maxUploadMb entitlement) through at all — verified live against
// this account with a 113MB video on 2026-07-17.

const UPLOAD_URL = 'https://api.cloudinary.com/v1_1/bayshore/auto/upload';
const UPLOAD_PRESET = 'swopapp';

// Cloudinary requires every chunk except the last to be at least 5MB.
const CHUNK_SIZE = 20 * 1024 * 1024;
// Single-request uploads are fine well past this, but chunking early keeps
// each request small enough to retry cheaply and far from the 413 cliff.
const CHUNK_THRESHOLD = 60 * 1024 * 1024;

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  try {
    // Cloudinary JSON errors are shaped { error: { message } }.
    const parsed = JSON.parse(text);
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    // HTML error page (e.g. nginx 413) — fall through to the generic text.
  }
  if (response.status === 413) return 'File is too large to upload.';
  return text.slice(0, 180) || response.statusText || `HTTP ${response.status}`;
}

// Legacy call sites pass FileReader data URIs; convert those back to binary.
export async function toUploadBlob(source: File | Blob | string): Promise<Blob> {
  if (typeof source !== 'string') return source;
  const response = await fetch(source);
  return response.blob();
}

function buildFormData(file: Blob, extraFields: Record<string, string>) {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', UPLOAD_PRESET);
  for (const [key, value] of Object.entries(extraFields)) {
    data.append(key, value);
  }
  return data;
}

export async function uploadToCloudinary(
  source: File | Blob | string,
  extraFields: Record<string, string> = {}
): Promise<string> {
  try {
    const blob = await toUploadBlob(source);

    if (blob.size <= CHUNK_THRESHOLD) {
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: buildFormData(blob, extraFields),
      });
      if (!response.ok) {
        throw new Error(`Upload failed: ${await readErrorMessage(response)}`);
      }
      return (await response.json()).secure_url;
    }

    const uploadId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    for (let start = 0; start < blob.size; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE, blob.size);
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: {
          'X-Unique-Upload-Id': uploadId,
          'Content-Range': `bytes ${start}-${end - 1}/${blob.size}`,
        },
        body: buildFormData(blob.slice(start, end), extraFields),
      });
      if (!response.ok) {
        throw new Error(`Upload failed: ${await readErrorMessage(response)}`);
      }
      if (end >= blob.size) {
        return (await response.json()).secure_url;
      }
    }

    // Unreachable: the final loop iteration always returns or throws.
    throw new Error('Upload failed: no final chunk response');
  } catch (err) {
    logger.error('Error uploading to Cloudinary:', err);
    throw err;
  }
}
