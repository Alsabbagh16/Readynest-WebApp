import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import BlogCard from '@/components/BlogCard';
import { Button } from '@/components/ui/button';
import { getPublishedBlogs } from '@/lib/storage/blogStorage';

const BlogsPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPublishedBlogs().then((data) => active && setBlogs(data || []))
      .catch(() => active && setError('Unable to load blog posts. Please try again later.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-16">
      <Helmet><title>Blogs - ReadyNest</title><meta name="description" content="Cleaning, maintenance, and home-care advice from ReadyNest." /></Helmet>
      <div className="container mx-auto px-4">
        <Button asChild variant="ghost" className="mb-8"><Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link></Button>
        <div className="mb-10 max-w-2xl"><h1 className="text-4xl font-extrabold text-slate-900">Blogs</h1><p className="mt-3 text-lg text-slate-600">Practical advice from the ReadyNest team.</p></div>
        {loading && <div className="rounded-lg border bg-white p-12 text-center text-slate-500">Loading blog posts…</div>}
        {!loading && error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>}
        {!loading && !error && blogs.length === 0 && <div className="rounded-lg border bg-white p-12 text-center text-slate-500">No blog posts have been published yet.</div>}
        {!loading && !error && blogs.length > 0 && <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{blogs.map((blog) => <BlogCard key={blog.id} blog={blog} />)}</div>}
      </div>
    </div>
  );
};

export default BlogsPage;

