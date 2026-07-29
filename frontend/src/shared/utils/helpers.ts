import { API_BASE_URL } from '../../config';

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
};

/**
 * Build a usable media URL from a stored path.
 * Absolute URLs (R2) are returned as-is; relative paths get the API base prepended.
 */
export const mediaUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  const p = String(path).replace(/\\/g, '/');
  if (/^https?:\/\//i.test(p)) return p;
  return `${API_BASE_URL}${p.startsWith('/') ? '' : '/'}${p}`;
};

/**
 * Fetch an audio file and return a blob URL that can be used with <audio> elements.
 * Uses fetch() which goes through Capacitor's native HTTP plugin on mobile,
 * bypassing WebView cross-origin restrictions on <audio>/<video> elements.
 */
export const fetchAudioBlobUrl = async (url: string): Promise<string> => {
  const resolved = mediaUrl(url);
  if (!resolved) throw new Error('Invalid audio URL');
  const response = await fetch(resolved);
  if (!response.ok) throw new Error(`Audio fetch failed: ${response.status}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
