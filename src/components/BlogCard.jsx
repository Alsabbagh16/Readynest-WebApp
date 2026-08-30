import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { DEFAULT_BLOG_IMAGE, formatBlogDate, summarizeBlog } from '@/lib/blogUtils';

const BlogCard = ({ blog }) => {
  const [imageSrc, setImageSrc] = useState(blog.image_url || DEFAULT_BLOG_IMAGE);

  return (
    <Card className="flex h-full flex-col overflow-hidden border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="aspect-[16/9] overflow-hidden bg-slate-100">
        <img src={imageSrc} onError={() => setImageSrc(DEFAULT_BLOG_IMAGE)} alt="" className="h-full w-full object-cover" />
      </div>
      <CardContent className="flex-1 p-5">
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatBlogDate(blog.published_at)}</span>
          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{blog.author}</span>
        </div>
        <h3 className="mb-3 line-clamp-2 text-xl font-bold text-slate-900">{blog.title}</h3>
        <p className="line-clamp-4 text-sm leading-6 text-slate-600">{summarizeBlog(blog.body_html)}</p>
      </CardContent>
      <CardFooter className="p-5 pt-0">
        <Button asChild className="w-full"><Link to={`/blogs/${blog.slug || blog.id}`}>Read More</Link></Button>
      </CardFooter>
    </Card>
  );
};

export default BlogCard;
