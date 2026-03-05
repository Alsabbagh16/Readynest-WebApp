import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";

export const useUserAddresses = (userId) => {
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const { toast } = useToast();

  const fetchUserAddresses = useCallback(async (idToFetch) => {
    if (!idToFetch) {
      setAddresses([]);
      return;
    }
    setLoadingAddresses(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', idToFetch)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      toast({ title: "Error", description: "Could not fetch user addresses.", variant: "destructive" });
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  }, [toast]);

  useEffect(() => {
    if (userId) {
      fetchUserAddresses(userId);
    } else {
      setAddresses([]); 
    }
  }, [userId, fetchUserAddresses]);

  const addAddress = useCallback(async (addressData) => {
    if (!userId) {
      toast({ title: "Add Address Failed", description: "User not available.", variant: "destructive" });
      return null;
    }
    setLoadingAddresses(true);
    try {
      const newAddressId = crypto.randomUUID(); 
      const { data, error } = await supabase
        .from('addresses')
        .insert([{ 
            ...addressData, 
            user_id: userId, 
            id: newAddressId,
            phone: addressData.phone || null,
            alt_phone: addressData.alt_phone || null,
        }]) 
        .select()
        .single();
      if (error) throw error;
      setAddresses((prev) => [data, ...prev]);
      toast({ title: "Address Added", description: "New address saved successfully." });
      return data;
    } catch (error) {
      toast({ title: "Add Address Failed", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setLoadingAddresses(false);
    }
  }, [userId, toast]);

  const updateAddress = useCallback(async (addressId, addressData) => {
    setLoadingAddresses(true);
    try {
      
      const { id, ...updatePayload } = addressData;
      const dataToUpdate = {
        ...updatePayload,
        phone: addressData.phone || null,
        alt_phone: addressData.alt_phone || null,
      };

      const { data, error } = await supabase
        .from('addresses')
        .update(dataToUpdate)
        .eq('id', addressId)
        .eq('user_id', userId) 
        .select()
        .single();
      if (error) throw error;
      setAddresses((prev) => prev.map((addr) => (addr.id === addressId ? data : addr)));
      toast({ title: "Address Updated", description: "Address details saved." });
      return data;
    } catch (error) {
      toast({ title: "Update Address Failed", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setLoadingAddresses(false);
    }
  }, [userId, toast]);

  const deleteAddress = useCallback(async (addressId) => {
    setLoadingAddresses(true);
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', userId); 
      if (error) throw error;
      setAddresses((prev) => prev.filter((addr) => addr.id !== addressId));
      toast({ title: "Address Deleted", description: "Address removed successfully." });
      return true;
    } catch (error) {
      toast({ title: "Delete Address Failed", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setLoadingAddresses(false);
    }
  }, [userId, toast]);

  const resetAddresses = useCallback(() => {
    setAddresses([]);
  }, []);

  const stableSetAddresses = useCallback((newAddresses) => {
    setAddresses(newAddresses);
  }, []);


  return {
    addresses,
    loadingAddresses,
    fetchUserAddresses,
    addAddressHook: addAddress,
    updateAddressHook: updateAddress,
    deleteAddressHook: deleteAddress,
    setAddresses: stableSetAddresses,
    resetAddresses,
  };
};