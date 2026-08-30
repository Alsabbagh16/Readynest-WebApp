import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import BlogCard from '@/components/BlogCard';
import { Button } from '@/components/ui/button';
import { getRecentPublishedBlogs } from '@/lib/storage/blogStorage';

const getCardsPerPage = () => {
  if (typeof window === 'undefined') return 3;
  if (window.innerWidth < 768) return 1;
  if (window.innerWidth < 1024) return 2;
  return 3;
};

const RecentBlogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(getCardsPerPage);

  useEffect(() => {
    let active = true;
    getRecentPublishedBlogs().then((data) => {
      if (active) setBlogs(data || []);
    }).catch(() => {
      if (active) setError('Unable to load recent blog posts right now.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleResize = () => setCardsPerPage(getCardsPerPage());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pageCount = Math.max(1, Math.ceil(blogs.length / cardsPerPage));
  useEffect(() => setPage((current) => Math.min(current, pageCount - 1)), [pageCount]);
  const visibleBlogs = useMemo(() => blogs.slice(page * cardsPerPage, (page + 1) * cardsPerPage), [blogs, page, cardsPerPage]);

  return (
    <section id="recent-blogs" className="bg-slate-50 py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">Recent Blogs</h2>
            <p className="mt-3 text-lg text-slate-600">Helpful ideas for a cleaner, more comfortable home.</p>
          </div>
          <Button asChild variant="outline"><Link to="/blogs">View All</Link></Button>
        </div>

        {loading && <div className="rounded-lg border bg-white p-10 text-center text-slate-500">Loading recent posts…</div>}
        {!loading && error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">{error}</div>}
        {!loading && !error && blogs.length === 0 && <div className="rounded-lg border bg-white p-10 text-center text-slate-500">No blog posts have been published yet.</div>}
        {!loading && !error && blogs.length > 0 && (
          <div aria-roledescription="carousel" aria-label="Recent blog posts">
            <div className={`grid gap-6 ${cardsPerPage === 1 ? 'grid-cols-1' : cardsPerPage === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {visibleBlogs.map((blog) => <BlogCard key={blog.id} blog={blog} />)}
            </div>
            {pageCount > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" aria-label="Previous blog posts" onClick={() => setPage((page - 1 + pageCount) % pageCount)}><ChevronLeft className="h-5 w-5" /></Button>
                <div className="flex gap-2">
                  {Array.from({ length: pageCount }, (_, index) => (
                    <button key={index} type="button" aria-label={`Go to blog slide ${index + 1}`} aria-current={page === index ? 'true' : undefined} onClick={() => setPage(index)} className={`h-2.5 w-2.5 rounded-full ${page === index ? 'bg-primary' : 'bg-slate-300'}`} />
                  ))}
                </div>
                <Button variant="outline" size="icon" aria-label="Next blog posts" onClick={() => setPage((page + 1) % pageCount)}><ChevronRight className="h-5 w-5" /></Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default RecentBlogs;

