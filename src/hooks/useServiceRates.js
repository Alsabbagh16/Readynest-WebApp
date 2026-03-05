import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const useServiceRates = () => {
  const [rates, setRates] = useState({
    minHours: 1,
    maxCleaners: 4,
    pricePerCleaner: null,
    subscriptionRate: null,
    subscriptionDiscount: 20
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'service_rates')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data?.value) {
        setRates(prev => ({ ...prev, ...data.value }));
      }
    } catch (err) {
      console.error('Error fetching service rates:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const saveRates = async (newRates) => {
    try {
      const { error: upsertError } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'service_rates', 
          value: newRates,
          updated_at: new Date().toISOString()
        });

      if (upsertError) throw upsertError;
      setRates(newRates);
      return { success: true };
    } catch (err) {
      console.error('Error saving service rates:', err);
      return { success: false, error: err };
    }
  };

  return { rates, loading, error, refreshRates: fetchRates, saveRates };
};