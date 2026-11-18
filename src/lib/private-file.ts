import { getAuthToken } from './api';

const dataUrlCache = new Map<string, Promise<string>>();

export async function fetchAuthenticatedDataUrl(src: string): Promise<string> {
  if (!src) return src;
  if (src.startsWith('data:')) return src;

  const cacheKey = `${getAuthToken() || 'cookie'}::${src}`;
  const cached = dataUrlCache.get(cacheKey);
  if (cached) return cached;

  const task = (async () => {
    const token = getAuthToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(src, {
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Failed to load image (${res.status})`);
    }
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to encode image'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image blob'));
      reader.readAsDataURL(blob);
    });
  })().catch((err) => {
    dataUrlCache.delete(cacheKey);
    throw err;
  });

  dataUrlCache.set(cacheKey, task);
  return task;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  if (parts.length !== 2) {
    throw new Error('Invalid image export payload');
  }
  const mimeMatch = parts[0].match(/data:([^;]+);base64/);
  const mime = mimeMatch?.[1] || 'application/octet-stream';
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 10000);
}
