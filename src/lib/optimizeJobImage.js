const MAX_IMAGE_EDGE = 1600;
const IMAGE_QUALITY = 0.82;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_EXTENSIONS = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

export async function optimizeJobImage(file) {
  if (!PHOTO_TYPES.has(file.type)) return file;

  let previewUrl;
  try {
    previewUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = previewUrl;
    await image.decode();

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const encode = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, IMAGE_QUALITY));
    let optimized = await encode('image/webp');

    // A browser without WebP encoding may silently return PNG.
    if (optimized?.type !== 'image/webp' && file.type === 'image/jpeg') {
      optimized = await encode('image/jpeg');
    }

    const extension = IMAGE_EXTENSIONS[optimized?.type];
    if (!extension || !optimized.size || optimized.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'job-photo';
    return new File([optimized], `${baseName}.${extension}`, {
      type: optimized.type,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }
}
