import type { ImageMetadata } from 'astro';
import { openSync, readSync, closeSync } from 'node:fs';

// Raster images render as <Picture> with AVIF first and WebP as the fallback.
export const pictureFormats = ['avif', 'webp'] as const;

// Animated WebP, PNG, and GIF can't become AVIF (sharp would copy the
// original bytes under an .avif name), so they stay WebP. Detected from the
// file's first bytes at build time.
const animated = new Map<string, boolean>();
export function isAnimated(src: ImageMetadata): boolean {
  const path = (src as ImageMetadata & { fsPath?: string }).fsPath;
  if (!path) return false;
  if (!animated.has(path)) {
    const head = Buffer.alloc(4096);
    const fd = openSync(path, 'r');
    const bytes = readSync(fd, head, 0, head.length, 0);
    closeSync(fd);
    const text = head.subarray(0, bytes).toString('latin1');
    animated.set(path, src.format === 'gif' || text.includes('ANIM') || text.includes('acTL'));
  }
  return animated.get(path)!;
}

/** A page's LCP image, for BaseLayout's preload. */
export interface LcpImage {
  src: ImageMetadata;
  widths: number[];
  sizes: string;
}

// Widths and sizes shared by an above-the-fold <Picture> and the matching
// preload in BaseLayout, so both request the same file.
export const heroBackdrop = { widths: [640, 960, 1280, 1920], sizes: '100vw' };
export const wipeSlide = { widths: [560, 1120], sizes: '(max-width: 977px) 92vw, 560px' };
export const postCover = { widths: [640, 960, 1280, 1920], sizes: '(max-width: 1200px) 100vw, 1140px' };
export const caseCover = { widths: [640, 960, 1280, 1920], sizes: '(max-width: 1240px) 100vw, 1200px' };
