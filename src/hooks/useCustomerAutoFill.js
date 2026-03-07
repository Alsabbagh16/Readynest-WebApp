import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";

export const useCustomerAutoFill = (selectedCustomerId, setFormData) => {
  const [loadingAutoFill, setLoadingAutoFill] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!selectedCustomerId) return;

    const fetchCustomerData = async () => {
      setLoadingAutoFill(true);
      try {
        // 1. Fetch Profile Data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, phone')
          .eq('id', selectedCustomerId)
          .single();

        if (profileError) throw profileError;

        if (profile) {
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          
          setFormData(prev => ({
            ...prev,
            name: prev.name || fullName, // Only fill if empty? User asked: "Logic to NOT overwrite manually edited fields on re-render" - usually this means if user typed something specific, don't clobber it *unless* it's a fresh selection. 
            // However, "When customer selection changes, re-fill for new customer." implies we SHOULD overwrite on selection change.
            // The hook runs on selectedCustomerId change. So we should overwrite.
            // But we should check if the field was "touched"? 
            // Let's stick to the prompt: "When customer selection changes, re-fill for new customer." -> Overwrite.
            // "When customer cleared, preserve existing typed values." -> This is handled by the caller usually, or we just don't run this effect.
            
            // Re-reading: "Include logic to NOT overwrite manually edited fields on re-render."
            // This likely refers to React re-renders, not selection changes. 
            // Since this useEffect only runs on `selectedCustomerId` change, it satisfies "re-fill for new customer".
            
            name: fullName || prev.name,
            email: profile.email || prev.email,
            phone: profile.phone || prev.phone,
            user_phone: profile.phone || prev.user_phone, // Support both field naming conventions
            customer_id: selectedCustomerId,
            user_id: selectedCustomerId // Sync user_id with customer_id
          }));
        }

        // 2. Fetch Addresses
        const { data: addresses, error: addressError } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', selectedCustomerId)
          .order('is_default', { ascending: false }) // True (default) comes first? Postgres boolean sort: false < true. So DESC puts true first.
          .order('created_at', { ascending: false }); // Then recent

        if (addressError) throw addressError;

        if (addresses && addresses.length > 0) {
            const bestAddress = addresses[0]; // First one is best due to sort
            
            setFormData(prev => {
                // Determine structure based on what exists in prev (flat or nested address object)
                const isFlat = 'address_street' in prev || 'street' in prev;
                const hasAddressObj = 'address' in prev && typeof prev.address === 'object';
                
                if (hasAddressObj) {
                    return {
                        ...prev,
                        address: {
                            ...prev.address,
                            street: bestAddress.street || '',
                            city: bestAddress.city || '',
                            zip: bestAddress.zip_code || bestAddress.zip || '',
                            country: bestAddress.country || '',
                            phone: bestAddress.phone || prev.address?.phone || '',
                            alt_phone: bestAddress.alt_phone || prev.address?.alt_phone || ''
                        }
                    };
                } else {
                    // Flat structure fallback (used in some forms)
                    return {
                        ...prev,
                        address_street: bestAddress.street || '',
                        address_city: bestAddress.city || '',
                        address_zip: bestAddress.zip_code || bestAddress.zip || '',
                        address_phone: bestAddress.phone || '',
                        address_alt_phone: bestAddress.alt_phone || ''
                    };
                }
            });
        }

      } catch (error) {
        console.error("Auto-fill error:", error);
        toast({ title: "Auto-fill failed", description: "Could not load customer details.", variant: "destructive" });
      } finally {
        setLoadingAutoFill(false);
      }
    };

    fetchCustomerData();
  }, [selectedCustomerId, setFormData, toast]);

  return { loadingAutoFill };
};