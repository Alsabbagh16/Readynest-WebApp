import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";

export const useUserProfile = (userId, initialProfileData = null, initialCreditsData = 0) => {
  const [profile, setProfile] = useState(initialProfileData);
  const [credits, setCredits] = useState(initialCreditsData);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (idToFetch) => {
    if (!idToFetch) {
      setProfile(null);
      setCredits(0);
      return;
    }
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', idToFetch)
        .single();
      if (error) throw error;
      setProfile(data || null);
      setCredits(data?.credits || 0);
    } catch (error) {
      toast({ title: "Error", description: "Could not fetch user profile.", variant: "destructive" });
      setProfile(null);
      setCredits(0);
    } finally {
      setLoadingProfile(false);
    }
  }, [toast]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile(userId);
    } else {
      setProfile(null);
      setCredits(0);
    }
  }, [userId, fetchUserProfile]);

  const updateUserProfile = useCallback(async (updatedData) => {
    if (!userId) {
      toast({ title: "Update Failed", description: "User not available.", variant: "destructive" });
      return;
    }
    setLoadingProfile(true);
    
    const dataForSupabase = { ...updatedData };
    if (dataForSupabase.password === '' || dataForSupabase.password === null || dataForSupabase.password === undefined) {
        delete dataForSupabase.password; 
    }
    
    if (dataForSupabase.password) {
        const { error: authError } = await supabase.auth.updateUser({ password: dataForSupabase.password });
        if (authError) {
            setLoadingProfile(false);
            toast({ title: "Password Update Failed", description: authError.message, variant: "destructive" });
            throw authError; 
        }
        delete dataForSupabase.password;
        delete dataForSupabase.current_password; 
    }

    const profileUpdatePayload = {
        first_name: dataForSupabase.first_name,
        last_name: dataForSupabase.last_name,
        dob: dataForSupabase.dob,
        user_type: dataForSupabase.user_type,
        credits: dataForSupabase.credits,
        updated_at: new Date().toISOString(),
    };
    
    // Explicitly include phone in the payload if it's present in updatedData
    // This ensures it's updated even if it's an empty string (to clear it)
    if ('phone' in dataForSupabase) {
        profileUpdatePayload.phone = dataForSupabase.phone;
    }


    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdatePayload)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      setCredits(data.credits); 
      toast({ title: "Profile Updated", description: "Your profile details have been saved." });
    } catch (error) {
      toast({ title: "Profile Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoadingProfile(false);
    }
  }, [userId, toast]);
  
  const updateCredits = useCallback(async (newCredits) => {
    if (!userId) return;
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ credits: newCredits, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('credits')
        .single();
      if (error) throw error;
      setCredits(data.credits);
      toast({ title: "Credits Updated", description: `Your credit balance is now ${data.credits}.` });
    } catch (error) {
      toast({ title: "Credits Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoadingProfile(false);
    }
  }, [userId, toast]);

  const resetProfile = useCallback(() => {
    setProfile(null);
    setCredits(0);
  }, []);

  const stableSetProfile = useCallback((newProfile) => {
    setProfile(newProfile);
  }, []);

  const stableSetCredits = useCallback((newCredits) => {
    setCredits(newCredits);
  }, []);

  return {
    profile,
    credits,
    loadingProfile,
    fetchUserProfile,
    updateUserProfile,
    updateCredits,
    setProfile: stableSetProfile,
    setCredits: stableSetCredits,
    resetProfile,
  };
};