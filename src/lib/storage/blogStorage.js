import { supabase } from '@/lib/supabase';

const BLOG_COLUMNS = 'id,slug,title,seo_title,seo_description,image_url,image_path,body_html,author,published_at,created_by,updated_by,created_at,updated_at';

const throwIfError = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const getRecentPublishedBlogs = async (limit = 12) => throwIfError(await supabase
  .from('blogs').select(BLOG_COLUMNS)
  .lte('published_at', new Date().toISOString())
  .order('published_at', { ascending: false }).limit(limit));

export const getPublishedBlogs = async () => throwIfError(await supabase
  .from('blogs').select(BLOG_COLUMNS)
  .lte('published_at', new Date().toISOString())
  .order('published_at', { ascending: false }));

export const getPublishedBlogByRoute = async (routeValue, isUuid = false) => throwIfError(await supabase
  .from('blogs').select(BLOG_COLUMNS).eq(isUuid ? 'id' : 'slug', routeValue)
  .lte('published_at', new Date().toISOString()).maybeSingle());

export const getAdminBlogs = async () => throwIfError(await supabase
  .from('blogs').select(BLOG_COLUMNS).order('published_at', { ascending: false }));

export const createBlog = async (payload) => throwIfError(await supabase
  .from('blogs').insert(payload).select(BLOG_COLUMNS).single());

export const updateBlog = async (id, payload) => throwIfError(await supabase
  .from('blogs').update({ ...payload, updated_at: new Date().toISOString() })
  .eq('id', id).select(BLOG_COLUMNS).single());

export const deleteBlog = async (id) => throwIfError(await supabase
  .from('blogs').delete().eq('id', id));
