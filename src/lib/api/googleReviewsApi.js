import { supabase } from '@/lib/supabase';

export const fetchGoogleBusinessReviews = async () => {
  const { data, error } = await supabase.functions.invoke('google-business-reviews', {
    body: { cache_bust: Date.now() },
  });

  if (error) throw error;
  return data || { reviews: [] };
};
