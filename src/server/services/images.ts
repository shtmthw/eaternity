import { randomBytes } from 'node:crypto';
import { readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isNotNull } from 'drizzle-orm';
import { MAX_IMAGE_BYTES } from '../../shared/constants.ts';
import { imageNameSchema } from '../../shared/schemas.ts';
import type { Database } from '../db/client.ts';
import { dishes } from '../db/schema.ts';

type ImageType = 'jpg' | 'png' | 'gif' | 'webp' | 'avif';

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

/** Looks at the first bytes of the file instead of trusting the name or the browser. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (ascii(bytes, 0, 8) === '\x89PNG\r\n\x1a\n') return 'png';
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return 'gif';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'webp';
  if (ascii(bytes, 4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(bytes, 8, 12))) return 'avif';
  return null;
}

export class ImageError extends Error {}

export async function saveImage(directory: string, file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new ImageError('Images must be 5 MB or smaller');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw new ImageError('Use a JPEG, PNG, WebP, AVIF or GIF image');

  const name = `${randomBytes(16).toString('hex')}.${type}`;
  await writeFile(path.join(directory, name), bytes);
  return name;
}

export async function removeImage(directory: string, name: string | null): Promise<void> {
  if (name && imageNameSchema.safeParse(name).success) {
    await rm(path.join(directory, name), { force: true });
  }
}

/**
 * Deletes uploads that no dish points to, for example when someone picked an
 * image and then closed the form. Recent files are kept in case a form is
 * still open.
 */
export async function removeUnusedImages(db: Database, directory: string, olderThanMs = 24 * 60 * 60 * 1000) {
  const used = new Set(
    db
      .select({ image: dishes.image })
      .from(dishes)
      .where(isNotNull(dishes.image))
      .all()
      .map((row) => row.image),
  );
  const cutoff = Date.now() - olderThanMs;
  let removed = 0;

  for (const name of await readdir(directory)) {
    if (used.has(name) || !imageNameSchema.safeParse(name).success) continue;
    const { mtimeMs } = await stat(path.join(directory, name));
    if (mtimeMs < cutoff) {
      await removeImage(directory, name);
      removed++;
    }
  }
  return removed;
}
