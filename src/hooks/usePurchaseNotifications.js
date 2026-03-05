import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const usePurchaseNotifications = () => {
  const { user } = useAuth();
  const [hasNewPurchases, setHasNewPurchases] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setHasNewPurchases(false);
        setLoading(false);
        return;
    }

    const checkNewPurchases = async () => {
      try {
        // Fetch the very latest purchase
        const { data, error } = await supabase
          .from('purchases')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is no rows found
             console.error("Error fetching latest purchase:", error);
        }

        if (data) {
          const lastViewed = localStorage.getItem(`lastViewedPurchaseTime_${user.id}`);
          // If never viewed, or if latest purchase is newer than last viewed
          if (!lastViewed || new Date(data.created_at) > new Date(lastViewed)) {
            setHasNewPurchases(true);
          } else {
            setHasNewPurchases(false);
          }
        }
      } catch (err) {
        console.error("Error checking purchases notification:", err);
      } finally {
        setLoading(false);
      }
    };

    checkNewPurchases();

    // Optional: Realtime subscription could go here to update badge instantly on new purchase
    const channel = supabase
      .channel('public:purchases')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'purchases', filter: `user_id=eq.${user.id}` }, (payload) => {
          setHasNewPurchases(true);
      })
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };

  }, [user]);

  const markAsViewed = () => {
     const now = new Date().toISOString();
     if (user) {
        localStorage.setItem(`lastViewedPurchaseTime_${user.id}`, now);
     }
     setHasNewPurchases(false);
  };

  return { hasNewPurchases, markAsViewed, loading };
};