const MAX_SIDE = 1600;

export const imageUrl = (name: string) => `/images/${name}`;

/**
 * Shrinks large photos in the browser before upload. A phone picture is often
 * 4000px wide and several megabytes, which the menu never needs.
 */
async function shrink(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 500_000) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    return blob?.type === 'image/webp' && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.set('image', await shrink(file), file.name);
  const response = await fetch('/api/images', { method: 'POST', body });
  const result = (await response.json().catch(() => ({}))) as { image?: string; message?: string };
  if (!response.ok || !result.image) throw new Error(result.message ?? 'The image could not be uploaded');
  return result.image;
}
