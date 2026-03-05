import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

const HourlyBookingHeroSection = () => {
  const [content, setContent] = useState({
    title: 'Book Your Cleaning Service',
    subtitle: 'Professional, reliable, and tailored to your needs.',
    ctaText: 'Get Started',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070&auto=format&fit=crop'
  });

  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase
        .from('website_content')
        .select('content')
        .eq('section_key', 'hourly_hero')
        .single();
      if (data?.content) {
        setContent(prev => ({ ...prev, ...data.content }));
      }
    };
    fetchContent();
  }, []);

  return (
    <div className="relative w-full h-[400px] md:h-[500px] bg-slate-900 overflow-hidden">
      <img 
        src={content.imageUrl} 
        alt="Cleaning Service Hero" 
        className="absolute inset-0 w-full h-full object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
      <div className="relative h-full flex flex-col justify-center items-center text-center px-4 max-w-4xl mx-auto z-10">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md"
        >
          {content.title}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg md:text-xl text-slate-200 mb-8 max-w-2xl drop-shadow"
        >
          {content.subtitle}
        </motion.p>
      </div>
    </div>
  );
};

export default HourlyBookingHeroSection;