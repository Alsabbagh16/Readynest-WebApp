import { supabase } from '@/lib/supabase';

const BLOG_IMAGES_BUCKET = 'blog-images';
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1200;
const WEBP_QUALITY = 0.82;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const canvasToBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('This browser could not optimize the image.')), 'image/webp', WEBP_QUALITY);
});

const loadImageSource = async (file) => {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
    } catch (error) {
      console.warn('ImageBitmap decoding unavailable, using image element fallback:', error);
    }
  }
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;
  try {
    await image.decode();
    return { image, width: image.naturalWidth, height: image.naturalHeight, cleanup: () => URL.revokeObjectURL(objectUrl) };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('The selected image could not be decoded.', { cause: error });
  }
};

export const optimizeBlogImage = async (file) => {
  if (!ACCEPTED_TYPES.has(file?.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Choose an image smaller than 15 MB.');

  const source = await loadImageSource(file);
  const scale = Math.min(1, MAX_WIDTH / source.width, MAX_HEIGHT / source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(source.image, 0, 0, width, height);
  source.cleanup();
  const blob = await canvasToBlob(canvas);
  return { blob, width, height, originalBytes: file.size, optimizedBytes: blob.size };
};

export const uploadBlogImage = async (blogId, blob) => {
  const path = `${blogId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(BLOG_IMAGES_BUCKET).upload(path, blob, {
    cacheControl: '31536000', contentType: 'image/webp', upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BLOG_IMAGES_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
};

export const removeBlogImage = async (path) => {
  if (!path) return;
  const { error } = await supabase.storage.from(BLOG_IMAGES_BUCKET).remove([path]);
  if (error) throw error;
};
