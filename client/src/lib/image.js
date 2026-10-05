const MAX_SIDE = 2000; // large enough to read small print, small enough to upload quickly

/** Shrinks a phone photo to a JPEG of about 0.5 MB before upload. Also fixes rotation via the browser's decoder. */
export async function prepareImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error('Use a JPG, PNG or WebP photo. iPhone HEIC photos need converting first.');
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That image could not be read. Try another photo.');
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('That image could not be processed. Try another photo.');
  return new File([blob], `${file.name.replace(/\.\w+$/, '') || 'receipt'}.jpg`, { type: 'image/jpeg' });
}
