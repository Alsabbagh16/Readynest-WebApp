import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag, Copy, Check } from "lucide-react";

const PromotionalBanner = () => {
  const [bannerData, setBannerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchBannerData = async () => {
      try {
        const { data, error } = await supabase
          .from('website_content')
          .select('content')
          .eq('section_key', 'dashboard_promo_banner')
          .single();

        if (error) {
          // If no data found, that's okay, just don't show banner
          if (error.code !== 'PGRST116') {
             console.error("Error fetching banner data:", error);
          }
          return;
        }

        if (data) {
          setBannerData(data.content);
        }
      } catch (err) {
        console.error("Unexpected error fetching banner:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBannerData();
  }, []);

  if (loading) {
    return <Skeleton className="w-full h-16 rounded-lg" />;
  }

  const handleCopy = async () => {
    if (!bannerData?.promoCode) return;
    try {
      await navigator.clipboard.writeText(bannerData.promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!bannerData || bannerData.isVisible === false) {
    return null;
  }

  return (
    <div onClick={handleCopy} className="w-full relative rounded-lg overflow-hidden border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 hover:border-primary/40 transition-all cursor-pointer group">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-3.5">
        <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
          <Tag className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{bannerData.title}</h4>
            {bannerData.description && (
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                {bannerData.description.replace(bannerData.promoCode || '', '').trim()}
              </p>
            )}
          </div>
        </div>
        {bannerData.promoCode && (
          <div className="flex-shrink-0 flex items-center gap-2">
            <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-md tracking-wide border border-dashed transition-colors ${
              copied 
                ? 'text-green-600 bg-green-50 border-green-300' 
                : 'text-primary bg-primary/10 border-primary/20'
            }`}>
              {copied ? 'Copied!' : bannerData.promoCode}
            </span>
            {copied 
              ? <Check className="h-3.5 w-3.5 text-green-600" />
              : <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default PromotionalBanner;