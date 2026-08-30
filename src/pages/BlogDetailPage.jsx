import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowLeft, CalendarDays, User } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BLOG_SLUG_PATTERN, DEFAULT_BLOG_IMAGE, UUID_PATTERN, formatBlogDate, sanitizeBlogHtml, summarizeBlog } from '@/lib/blogUtils';
import { getPublishedBlogByRoute } from '@/lib/storage/blogStorage';

const BlogDetailPage = () => {
  const { blogSlug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageSrc, setImageSrc] = useState(DEFAULT_BLOG_IMAGE);

  useEffect(() => {
    let active = true;
    const isUuid = UUID_PATTERN.test(blogSlug || '');
    if (!isUuid && !BLOG_SLUG_PATTERN.test(blogSlug || '')) {
      setError('This blog post could not be found.'); setLoading(false); return undefined;
    }
    getPublishedBlogByRoute(blogSlug, isUuid).then((data) => {
      if (!active) return;
      if (!data) setError('This blog post is unavailable or has not been published yet.');
      else { setBlog(data); setImageSrc(data.image_url || DEFAULT_BLOG_IMAGE); }
    }).catch(() => active && setError('Unable to load this blog post.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [blogSlug]);

  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-16">
      <Helmet>
        <title>{blog ? (blog.seo_title || `${blog.title} - ReadyNest`) : 'Blog - ReadyNest'}</title>
        {blog && <meta name="description" content={blog.seo_description || summarizeBlog(blog.body_html)} />}
        {blog && <meta property="og:title" content={blog.seo_title || blog.title} />}
        {blog && <meta property="og:description" content={blog.seo_description || summarizeBlog(blog.body_html)} />}
        {blog && <meta property="og:type" content="article" />}
        {blog && <meta property="og:image" content={blog.image_url || DEFAULT_BLOG_IMAGE} />}
      </Helmet>
      <div className="container mx-auto max-w-4xl px-4">
        <Button asChild variant="ghost" className="mb-8"><Link to="/blogs"><ArrowLeft className="mr-2 h-4 w-4" />Back to Blogs</Link></Button>
        {loading && <div className="rounded-lg border bg-white p-12 text-center text-slate-500">Loading blog post…</div>}
        {!loading && error && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-10 text-center text-amber-800">{error}</div>}
        {!loading && blog && <article className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <img src={imageSrc} onError={() => setImageSrc(DEFAULT_BLOG_IMAGE)} alt="" className="aspect-[16/8] w-full object-cover" />
          <div className="p-6 md:p-10">
            <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-5xl">{blog.title}</h1>
            <div className="mt-5 flex flex-wrap gap-5 text-sm text-slate-500"><span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatBlogDate(blog.published_at)}</span><span className="flex items-center gap-1.5"><User className="h-4 w-4" />{blog.author}</span></div>
            <div className="blog-content mt-8 text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(blog.body_html) }} />
          </div>
        </article>}
      </div>
    </div>
  );
};

export default BlogDetailPage;
