import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { findEmployeeById, findEmployeeByEmail } from '@/lib/storage/employeeStorage';
import { useLoading } from '@/contexts/LoadingContext';
import { useAuth } from '@/contexts/AuthContext';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(undefined); 
  const [adminProfile, setAdminProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAuthLoading, setAdminAuthLoading] = useState(true); 
  const [adminProfileLoading, setAdminProfileLoading] = useState(false); 
  const { toast } = useToast();
  const { addLoadingMessage, removeLoadingMessage } = useLoading();
  const { user: sharedAuthUser, authContextLoading } = useAuth();
  const adminProfileRef = useRef(null);

  const resetAdminState = useCallback(() => {
    adminProfileRef.current = null;
    setAdminProfile(null);
    setIsAdmin(false);
    setAdminProfileLoading(false); 
  }, []);

  const fetchAdminProfileAndUpdateState = useCallback(async (supabaseUserId, isExplicitAdminLogin = false) => {
    if (!supabaseUserId) {
      resetAdminState();
      return;
    }

    // If we are not explicitly logging in and already have the correct profile, skip fetching
    if (!isExplicitAdminLogin && adminProfileRef.current?.id === supabaseUserId) {
        return;
    }

    const profileMsgId = addLoadingMessage("Fetching admin profile details...");
    setAdminProfileLoading(true);

    try {
      const employeeProfile = await findEmployeeById(supabaseUserId);
      
      if (employeeProfile && (employeeProfile.role === 'admin' || employeeProfile.role === 'superadmin' || employeeProfile.role === 'staff')) {
        adminProfileRef.current = employeeProfile;
        setAdminProfile(employeeProfile);
        setIsAdmin(true);
      } else {
        resetAdminState();
        if (isExplicitAdminLogin) {
          if (employeeProfile) {
            toast({ title: "Access Denied", description: "You do not have authorized privileges.", variant: "destructive" });
          } else {
            toast({ title: "Login Failed", description: "Admin account not found in employee records.", variant: "destructive" });
          }
        }
      }
    } catch (error) {
      console.error('[AdminAuthContext] Error fetching admin profile:', error.message);
      if (isExplicitAdminLogin) {
        toast({ title: "Admin Profile Error", description: `Could not fetch admin details: ${error.message}`, variant: "destructive" });
      }
      resetAdminState();
    } finally {
      removeLoadingMessage(profileMsgId);
      setAdminProfileLoading(false);
    }
  }, [toast, addLoadingMessage, removeLoadingMessage, resetAdminState]);

  useEffect(() => {
    let active = true;

    const synchronizeAdmin = async () => {
      if (authContextLoading || sharedAuthUser === undefined) {
        if (adminUser === undefined) setAdminAuthLoading(true);
        return;
      }

      if (!sharedAuthUser) {
        if (!active) return;
        setAdminUser(null);
        resetAdminState();
        setAdminAuthLoading(false);
        return;
      }

      // Preserve object identity for unchanged users. Supabase may publish a fresh
      // session object after focus/token refresh, but that is not a new admin login.
      setAdminUser((currentUser) => currentUser?.id === sharedAuthUser.id ? currentUser : sharedAuthUser);

      if (adminProfileRef.current?.id === sharedAuthUser.id) {
        setAdminAuthLoading(false);
        return;
      }

      setAdminAuthLoading(true);
      await fetchAdminProfileAndUpdateState(sharedAuthUser.id, false);
      if (active) setAdminAuthLoading(false);
    };

    synchronizeAdmin();
    return () => { active = false; };
  // Deliberately depend on the stable identity, not the refreshed session object.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedAuthUser?.id, authContextLoading, fetchAdminProfileAndUpdateState, resetAdminState]);


  const adminLogin = async (email, password) => {
    setAdminAuthLoading(true);
    const loginMsgId = addLoadingMessage("Admin logging in...");
    try {
      // Convert email to lowercase for case-insensitive authentication
      const normalizedEmail = email.toLowerCase();
      
      // 1. Check if employee exists first (Pre-check)
      const employee = await findEmployeeByEmail(normalizedEmail);
      if (!employee) {
        throw new Error("Admin account not found.");
      }
      if (!['admin', 'superadmin', 'staff'].includes(employee.role)) {
        throw new Error("Access Denied: User is not an authorized administrator.");
      }

      // 2. Perform Supabase Login
      const { data: { user: supabaseSessUser }, error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signInError) throw signInError;
      if (!supabaseSessUser) throw new Error("Login failed.");

      setAdminUser(supabaseSessUser); 
      await fetchAdminProfileAndUpdateState(supabaseSessUser.id, true); 
      
      toast({ title: "Admin Login Successful", description: `Welcome back, ${employee.full_name || 'Admin'}!` });

    } catch (error) {
      toast({ title: "Admin Login Failed", description: error.message, variant: "destructive" });
      throw error;
    } finally {
      removeLoadingMessage(loginMsgId);
      setAdminAuthLoading(false); 
    }
  };

  const adminLogout = async () => {
    setAdminAuthLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({ title: "Logged Out", description: "Admin session ended." });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAdminUser(null);
      resetAdminState();
      setAdminAuthLoading(false);
    }
  };
  
  const value = {
    adminUser,
    adminProfile,
    isAdmin,
    loading: adminAuthLoading || adminProfileLoading, 
    adminAuthLoading, 
    adminProfileLoading,
    adminLogin,
    adminLogout,
    fetchAdminProfile: fetchAdminProfileAndUpdateState, 
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
