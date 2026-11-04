import { type IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES } from '@eaternity/shared';
import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { HttpError } from '../lib/http';

const EXTENSIONS: Record<(typeof IMAGE_MIME_TYPES)[number], string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

const isImageType = (type: string): type is keyof typeof EXTENSIONS => type in EXTENSIONS;

/**
 * Stores a single image per request. File names are generated on the server,
 * so nothing from the client ever ends up in a path.
 */
export function createImageUpload(directory: string) {
  return multer({
    storage: multer.diskStorage({
      destination: directory,
      filename: (_req, file, done) => {
        const extension = isImageType(file.mimetype) ? EXTENSIONS[file.mimetype] : '';
        done(null, `${Date.now()}-${randomBytes(8).toString('hex')}${extension}`);
      },
    }),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    fileFilter: (_req, file, done) => {
      if (isImageType(file.mimetype)) done(null, true);
      else done(new HttpError(400, 'Upload a JPEG, PNG, WebP, AVIF or GIF image'));
    },
  });
}

export async function removeImage(directory: string, fileName: string): Promise<void> {
  if (!/^[\w.-]+$/.test(fileName)) return;
  await rm(path.join(directory, fileName), { force: true });
}
