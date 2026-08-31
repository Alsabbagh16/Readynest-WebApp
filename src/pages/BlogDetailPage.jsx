import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowLeft, CalendarDays, User } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import BlogCard from '@/components/BlogCard';
import PreferredSourcesButton from '@/components/PreferredSourcesButton';
import { Button } from '@/components/ui/button';
import { BLOG_SLUG_PATTERN, DEFAULT_BLOG_IMAGE, UUID_PATTERN, formatBlogDate, sanitizeBlogHtml, summarizeBlog } from '@/lib/blogUtils';
import { getPublishedBlogByRoute, getRecentPublishedBlogs } from '@/lib/storage/blogStorage';

const BlogDetailPage = () => {
  const { blogSlug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageSrc, setImageSrc] = useState(DEFAULT_BLOG_IMAGE);
  const [otherBlogs, setOtherBlogs] = useState([]);

  useEffect(() => {
    let active = true;
    setBlog(null);
    setLoading(true);
    setError('');
    setImageSrc(DEFAULT_BLOG_IMAGE);
    setOtherBlogs([]);

    const isUuid = UUID_PATTERN.test(blogSlug || '');
    if (!isUuid && !BLOG_SLUG_PATTERN.test(blogSlug || '')) {
      setError('This blog post could not be found.');
      setLoading(false);
      return undefined;
    }

    getPublishedBlogByRoute(blogSlug, isUuid).then((data) => {
      if (!active) return;
      if (!data) setError('This blog post is unavailable or has not been published yet.');
      else {
        setBlog(data);
        setImageSrc(data.image_url || DEFAULT_BLOG_IMAGE);
      }
    }).catch(() => active && setError('Unable to load this blog post.'))
      .finally(() => active && setLoading(false));

    getRecentPublishedBlogs(4).then((data) => {
      if (!active) return;
      const filteredBlogs = (data || [])
        .filter((candidate) => candidate.slug !== blogSlug && candidate.id !== blogSlug)
        .slice(0, 3);
      setOtherBlogs(filteredBlogs);
    }).catch(() => active && setOtherBlogs([]));

    return () => { active = false; };
  }, [blogSlug]);

  const relatedBlogs = otherBlogs.slice(0, 3);

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

      <div className="container mx-auto max-w-7xl px-4">
        <Button asChild variant="ghost" className="mb-8">
          <Link to="/blogs"><ArrowLeft className="mr-2 h-4 w-4" />Back to Blogs</Link>
        </Button>

        {loading && <div className="rounded-lg border bg-white p-12 text-center text-slate-500">Loading blog post…</div>}
        {!loading && error && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-10 text-center text-amber-800">{error}</div>}

        {!loading && blog && (
          <>
            <div className="mx-auto max-w-6xl">
              <article className="min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm">
                <img src={imageSrc} onError={() => setImageSrc(DEFAULT_BLOG_IMAGE)} alt="" className="aspect-[16/8] w-full object-cover" />
                <div className="p-6 md:p-10">
                  <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-5xl">{blog.title}</h1>
                  <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-5 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatBlogDate(blog.published_at)}</span>
                      <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{blog.author}</span>
                    </div>
                    <PreferredSourcesButton className="min-h-10 shrink-0" />
                  </div>
                  <div className="blog-content mt-8 text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(blog.body_html) }} />
                </div>
              </article>
            </div>

            {relatedBlogs.length > 0 && (
              <section className="mt-14" aria-labelledby="related-blogs-heading">
                <h2 id="related-blogs-heading" className="text-2xl font-bold text-slate-900 md:text-3xl">Related Blogs</h2>
                <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {relatedBlogs.map((relatedBlog) => <BlogCard key={relatedBlog.id} blog={relatedBlog} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BlogDetailPage;
