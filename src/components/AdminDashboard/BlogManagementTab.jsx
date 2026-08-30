import React, { useCallback, useEffect, useState } from 'react';
import { Edit2, ImagePlus, Loader2, Newspaper, Plus, Trash2, X } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import BlogEditor from '@/components/AdminDashboard/BlogEditor';
import { BLOG_SLUG_PATTERN, DEFAULT_BLOG_IMAGE, blogHtmlToText, createBlogSlug, formatBlogDate, sanitizeBlogHtml } from '@/lib/blogUtils';
import { createBlog, deleteBlog, getAdminBlogs, updateBlog } from '@/lib/storage/blogStorage';
import { optimizeBlogImage, removeBlogImage, uploadBlogImage } from '@/lib/storage/blogImageStorage';

const emptyForm = { title: '', slug: '', seo_title: '', seo_description: '', image_url: '', image_path: '', body_html: '<p></p>', published_at: '', author: '' };
const formatBytes = (bytes) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const BlogManagementTab = () => {
  const { adminUser, adminProfile } = useAdminAuth();
  const { hasPerm, isSuperadmin, hasUiRoles } = usePermissionContext();
  const { toast } = useToast();
  const canManage = isSuperadmin || !hasUiRoles || hasPerm('blogs.manage');
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [optimizedImage, setOptimizedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [optimizingImage, setOptimizingImage] = useState(false);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  const resetSelectedImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
    setOptimizedImage(null);
    setRemoveExistingImage(false);
  };

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    try { setBlogs(await getAdminBlogs() || []); }
    catch (error) { toast({ title: 'Unable to load blogs', description: error.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { loadBlogs(); }, [loadBlogs]);

  const openCreate = () => {
    resetSelectedImage();
    setSlugTouched(false);
    setEditing(null);
    setForm({ ...emptyForm, author: adminProfile?.full_name || '', published_at: toLocalInput(new Date()) });
    setFormOpen(true);
  };
  const openEdit = (blog) => {
    resetSelectedImage();
    setSlugTouched(true);
    setEditing(blog);
    setForm({ title: blog.title, slug: blog.slug || '', seo_title: blog.seo_title || '', seo_description: blog.seo_description || '', image_url: blog.image_url || '', image_path: blog.image_path || '', body_html: blog.body_html, published_at: toLocalInput(blog.published_at), author: blog.author });
    setFormOpen(true);
  };

  const handleImageSelection = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setOptimizingImage(true);
    try {
      const optimized = await optimizeBlogImage(file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setOptimizedImage(optimized);
      setImagePreview(URL.createObjectURL(optimized.blob));
      setRemoveExistingImage(false);
    } catch (error) {
      toast({ title: 'Could not use image', description: error.message, variant: 'destructive' });
    } finally { setOptimizingImage(false); }
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
    setOptimizedImage(null);
    setRemoveExistingImage(true);
    setForm((current) => ({ ...current, image_url: '', image_path: '' }));
  };

  const validate = () => {
    if (!form.title.trim() || !form.slug.trim() || !form.author.trim() || !form.published_at || !blogHtmlToText(form.body_html)) return 'Title, route slug, author, publication date, and body are required.';
    if (!BLOG_SLUG_PATTERN.test(form.slug) || form.slug.length < 3 || form.slug.length > 100) return 'Route slug must be 3–100 lowercase letters, numbers, or single hyphens.';
    if (form.seo_title.trim().length > 70) return 'SEO title must be 70 characters or fewer.';
    if (form.seo_description.trim().length > 180) return 'SEO description must be 180 characters or fewer.';
    if (Number.isNaN(new Date(form.published_at).getTime())) return 'Enter a valid publication date and time.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) { toast({ title: 'Check the blog post', description: validationError, variant: 'destructive' }); return; }
    setSaving(true);
    const blogId = editing?.id || crypto.randomUUID();
    let uploadedImage = null;
    try {
      if (optimizedImage) uploadedImage = await uploadBlogImage(blogId, optimizedImage.blob);
      const payload = {
        ...(!editing ? { id: blogId, created_by: adminUser.id } : {}),
        title: form.title.trim(), slug: form.slug.trim(),
        seo_title: form.seo_title.trim() || null, seo_description: form.seo_description.trim() || null,
        body_html: sanitizeBlogHtml(form.body_html), author: form.author.trim(),
        published_at: new Date(form.published_at).toISOString(), updated_by: adminUser.id,
        image_url: uploadedImage?.publicUrl || (removeExistingImage ? null : form.image_url || null),
        image_path: uploadedImage?.path || (removeExistingImage ? null : form.image_path || null),
      };
      if (editing) await updateBlog(editing.id, payload); else await createBlog(payload);
      if (editing?.image_path && (uploadedImage || removeExistingImage)) {
        try { await removeBlogImage(editing.image_path); }
        catch (error) { console.error('Old blog image cleanup failed:', error); }
      }
      toast({ title: editing ? 'Blog updated' : 'Blog created', description: 'The blog post was saved successfully.' });
      setFormOpen(false); await loadBlogs();
    } catch (error) {
      if (uploadedImage?.path) { try { await removeBlogImage(uploadedImage.path); } catch (cleanupError) { console.error('Failed to clean up uploaded blog image:', cleanupError); } }
      toast({ title: 'Could not save blog', description: error.code === '23505' ? 'That route slug is already used by another blog post.' : error.message, variant: 'destructive' });
    }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try { await deleteBlog(deleting.id); if (deleting.image_path) { try { await removeBlogImage(deleting.image_path); } catch (error) { console.error('Deleted blog image cleanup failed:', error); } } toast({ title: 'Blog deleted' }); setDeleting(null); await loadBlogs(); }
    catch (error) { toast({ title: 'Could not delete blog', description: error.message, variant: 'destructive' }); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Newspaper className="h-6 w-6" />Blog Management</h2><p className="mt-1 text-slate-500">Create and schedule ReadyNest blog posts.</p></div>
      {canManage && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Blog Post</Button>}
    </div>
    <div className="overflow-hidden rounded-xl border bg-white">
      {loading ? <div className="flex justify-center p-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : blogs.length === 0 ? <div className="p-12 text-center text-slate-500">No blog posts have been created.</div> : <Table>
        <TableHeader><TableRow><TableHead>Post</TableHead><TableHead>Author</TableHead><TableHead>Publication</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>{blogs.map((blog) => { const published = new Date(blog.published_at) <= new Date(); return <TableRow key={blog.id}>
          <TableCell><div className="flex min-w-[260px] items-center gap-3"><img src={blog.image_url || DEFAULT_BLOG_IMAGE} onError={(event) => { event.currentTarget.src = DEFAULT_BLOG_IMAGE; }} alt="" className="h-14 w-20 rounded object-cover" /><div><p className="font-semibold text-slate-900">{blog.title}</p><p className="font-mono text-xs text-slate-400">/blogs/{blog.slug}</p></div></div></TableCell>
          <TableCell>{blog.author}</TableCell><TableCell>{formatBlogDate(blog.published_at)}</TableCell><TableCell><Badge variant={published ? 'success' : 'warning'}>{published ? 'Published' : 'Scheduled'}</Badge></TableCell>
          <TableCell><div className="flex justify-end gap-2">{canManage && <><Button size="icon" variant="outline" aria-label={`Edit ${blog.title}`} onClick={() => openEdit(blog)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="destructive" aria-label={`Delete ${blog.title}`} onClick={() => setDeleting(blog)}><Trash2 className="h-4 w-4" /></Button></>}</div></TableCell>
        </TableRow>; })}</TableBody>
      </Table>}
    </div>

    <Dialog open={formOpen} onOpenChange={(open) => !saving && setFormOpen(open)}><DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Edit Blog Post' : 'Create Blog Post'}</DialogTitle><DialogDescription>Posts become public automatically at their publication date and time.</DialogDescription></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="blog-title">Title</Label><Input id="blog-title" value={form.title} onChange={(event) => { const title = event.target.value; setForm((current) => ({ ...current, title, ...(!slugTouched ? { slug: createBlogSlug(title) } : {}) })); }} maxLength={180} required /></div><div className="space-y-2"><Label htmlFor="blog-author">Author</Label><Input id="blog-author" value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} maxLength={100} required /></div></div>
        <div className="space-y-2"><Label htmlFor="blog-slug">Route slug</Label><div className="flex items-center rounded-md border bg-white focus-within:ring-2 focus-within:ring-ring"><span className="whitespace-nowrap border-r px-3 text-sm text-slate-500">/blogs/</span><Input id="blog-slug" value={form.slug} onChange={(event) => { setSlugTouched(true); setForm({ ...form, slug: createBlogSlug(event.target.value) }); }} className="border-0 focus-visible:ring-0" placeholder="spring-cleaning-tips" maxLength={100} required /></div><p className="text-xs text-slate-500">Changing this changes the public URL. Existing UUID links continue to work.</p></div>
        <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="blog-seo-title">SEO page title (optional)</Label><Input id="blog-seo-title" value={form.seo_title} onChange={(event) => setForm({ ...form, seo_title: event.target.value })} placeholder={`${form.title || 'Blog title'} - ReadyNest`} maxLength={70} /><p className="text-right text-xs text-slate-400">{form.seo_title.length}/70</p></div><div className="space-y-2"><Label htmlFor="blog-seo-description">SEO description (optional)</Label><Input id="blog-seo-description" value={form.seo_description} onChange={(event) => setForm({ ...form, seo_description: event.target.value })} placeholder="Short description for search results and sharing" maxLength={180} /><p className="text-right text-xs text-slate-400">{form.seo_description.length}/180</p></div></div>
        <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Blog image (optional)</Label><label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 p-5 text-sm text-slate-600 transition hover:bg-slate-50"><ImagePlus className="h-5 w-5" />{optimizingImage ? 'Optimizing image…' : 'Choose JPEG, PNG, or WebP'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelection} disabled={optimizingImage || saving} /></label>{optimizedImage && <p className="text-xs text-emerald-700">Optimized to {optimizedImage.width}×{optimizedImage.height}: {formatBytes(optimizedImage.originalBytes)} → {formatBytes(optimizedImage.optimizedBytes)}</p>}<p className="text-xs text-slate-500">Images are resized to fit 1600×1200 and converted to WebP automatically.</p></div><div className="space-y-2"><Label htmlFor="blog-date">Date Published</Label><Input id="blog-date" type="datetime-local" value={form.published_at} onChange={(event) => setForm({ ...form, published_at: event.target.value })} required /></div></div>
        <div className="relative aspect-[16/5] overflow-hidden rounded-lg border bg-slate-50"><img src={imagePreview || form.image_url || DEFAULT_BLOG_IMAGE} onError={(event) => { event.currentTarget.src = DEFAULT_BLOG_IMAGE; }} alt="Blog preview" className="h-full w-full object-cover" />{(imagePreview || form.image_url) && <Button type="button" size="icon" variant="destructive" className="absolute right-3 top-3" aria-label="Remove blog image" onClick={handleRemoveImage}><X className="h-4 w-4" /></Button>}</div>
        <div className="space-y-2"><Label>Body of text</Label><BlogEditor key={editing?.id || 'new'} value={form.body_html} onChange={(body_html) => setForm((current) => ({ ...current, body_html }))} /></div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving || optimizingImage}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? 'Save Changes' : 'Create Blog Post'}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>

    <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete blog post?</AlertDialogTitle><AlertDialogDescription>This permanently deletes “{deleting?.title}”. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
};

export default BlogManagementTab;
