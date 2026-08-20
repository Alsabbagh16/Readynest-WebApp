import { supabase } from '@/lib/supabase';

export const fetchGoogleBusinessReviews = async () => {
  const { data, error } = await supabase.functions.invoke('google-business-reviews', {
    method: 'GET',
  });

  if (error) throw error;
  return data || { reviews: [] };
};
