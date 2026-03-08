import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { findEmployeeById, findEmployeeByEmail } from '@/lib/storage/employeeStorage';
import { useLoading } from '@/contexts/LoadingContext';
import { useLocation } from 'react-router-dom';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(undefined); 
  const [adminProfile, setAdminProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAuthLoading, setAdminAuthLoading] = useState(true); 
  const [adminProfileLoading, setAdminProfileLoading] = useState(false); 
  const { toast } = useToast();
  const { addLoadingMessage, removeLoadingMessage } = useLoading();
  const location = useLocation();

  const resetAdminState = useCallback(() => {
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
    if (!isExplicitAdminLogin && adminProfile && adminProfile.id === supabaseUserId) {
        return;
    }

    const profileMsgId = addLoadingMessage("Fetching admin profile details...");
    setAdminProfileLoading(true);

    try {
      const employeeProfile = await findEmployeeById(supabaseUserId);
      
      if (employeeProfile && (employeeProfile.role === 'admin' || employeeProfile.role === 'superadmin' || employeeProfile.role === 'staff')) {
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
  }, [toast, addLoadingMessage, removeLoadingMessage, resetAdminState, adminProfile]);

  useEffect(() => {
    // Only perform admin checks if we are on an admin route
    // Admin routes are defined as starting with /admin-panel or /admin-dashboard
    const isAdminRoute = location.pathname.startsWith('/admin-panel') || location.pathname.startsWith('/admin-dashboard');

    if (!isAdminRoute) {
        // If we are not on an admin route, ensure we aren't holding onto admin state that might confuse things
        // or trigger unwanted UI elements.
        if (adminUser || isAdmin) {
            setAdminUser(null);
            resetAdminState();
        }
        setAdminAuthLoading(false);
        return; 
    }

    const checkSession = async () => {
        setAdminAuthLoading(true);
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            const supabaseSessUser = session?.user ?? null;
            setAdminUser(supabaseSessUser);

            if (supabaseSessUser) {
                await fetchAdminProfileAndUpdateState(supabaseSessUser.id, false);
            } else {
                resetAdminState();
            }
        } catch (error) {
            console.error("Admin session check failed", error);
            resetAdminState();
        } finally {
            setAdminAuthLoading(false);
        }
    };

    checkSession();

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (location.pathname.startsWith('/admin-panel') || location.pathname.startsWith('/admin-dashboard')) {
            const supabaseSessUser = session?.user ?? null;
            setAdminUser(supabaseSessUser);
            if (supabaseSessUser) {
              await fetchAdminProfileAndUpdateState(supabaseSessUser.id, false);
            } else {
              resetAdminState();
            }
        }
      }
    );
    
    return () => {
      authListener?.unsubscribe();
    };
  }, [location.pathname, fetchAdminProfileAndUpdateState, resetAdminState]);


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