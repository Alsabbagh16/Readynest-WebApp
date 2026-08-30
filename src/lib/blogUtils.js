import DOMPurify from 'dompurify';

export const DEFAULT_BLOG_IMAGE = '/web-app-manifest-512x512.png';
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createBlogSlug = (value = '') => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 100)
  .replace(/-+$/g, '');

export const sanitizeBlogHtml = (html = '') => DOMPurify.sanitize(html, {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['style', 'onerror', 'onclick'],
});

export const blogHtmlToText = (html = '') => {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, ' ');
  const container = document.createElement('div');
  container.innerHTML = sanitizeBlogHtml(html);
  return (container.textContent || '').replace(/\s+/g, ' ').trim();
};

export const summarizeBlog = (html, limit = 160) => {
  const text = blogHtmlToText(html);
  return text.length <= limit ? text : `${text.slice(0, limit).trimEnd()}…`;
};

export const isValidHttpUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const formatBlogDate = (value) => new Intl.DateTimeFormat('en-BH', {
  year: 'numeric', month: 'long', day: 'numeric',
}).format(new Date(value));
