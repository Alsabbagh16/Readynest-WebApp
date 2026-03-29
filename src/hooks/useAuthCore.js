import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { useLoading } from '@/contexts/LoadingContext';

export const useAuthCore = () => {
  const [user, setUser] = useState(undefined);
  const [authContextLoading, setAuthContextLoading] = useState(true);
  const [authError, setAuthError] = useState(null); // 'SESSION_RECOVERY_FAILED' | 'CHECK_SESSION_ERROR' | null
  const { toast } = useToast();
  const { addLoadingMessage, removeLoadingMessage } = useLoading();

  const handleAuthError = useCallback((error, contextMessage) => {
    console.error(`[AuthCore] ${contextMessage} error:`, error.message, error);
    const isRefreshError = error.message && (
      error.message.includes("Invalid Refresh Token") || 
      error.message.includes("Refresh Token Not Found") ||
      (error.code === 'refresh_token_not_found')
    );

    if (isRefreshError) {
      setUser(null);
    } else {
      toast({ title: `Auth Error (${contextMessage})`, description: error.message, variant: "destructive" });
      setUser(null);
    }
  }, [toast]);

  const checkSession = useCallback(async (isRetry = false) => {
    let msgId;
    if (isRetry) {
       msgId = addLoadingMessage("Retrying connection...");
       setAuthContextLoading(true);
       setAuthError(null);
    }

    try {
      // 1. Initial Session Check
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;

      if (session?.user) {
        setUser(session.user);
        setAuthError(null);
        if (isRetry) {
             toast({ title: "Connection Restored", description: "You are successfully logged in." });
        }
      } else {
        // 2. Redirect Handling & Retry Logic
        const currentUrl = window.location.href;
        // Check for both implicit (hash) and PKCE (search) params
        const isAuthRedirect = 
          currentUrl.includes('code=') || 
          currentUrl.includes('access_token=') || 
          currentUrl.includes('error=') ||
          currentUrl.includes('type=recovery');

        if (isAuthRedirect) {
          console.log("[AuthCore] OAuth redirect detected. Verifying session...");
          
          // Mobile browsers (iOS especially) can be slow to persist local storage from the auth callback
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Retry checking session - this catches cases where the client library was slightly delayed
          const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession();
          
          if (retrySession?.user) {
            setUser(retrySession.user);
            setAuthError(null);
          } else {
            // 3. Manual Refresh Attempt (Last Resort)
            console.log("[AuthCore] Session missing after redirect. Attempting manual refresh...");
            
            // Only works if a refresh token was successfully stored during the redirect process
            const { data: { session: refreshSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshSession?.user) {
              setUser(refreshSession.user);
              setAuthError(null);
            } else {
              console.warn("[AuthCore] All session recovery attempts failed.");
              setAuthError('SESSION_RECOVERY_FAILED');
              setUser(null);
            }
          }
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("[AuthCore] Check session failed:", error);
      // For network errors or unexpected throw, we allow retry
      if (isRetry || !user) {
         setAuthError('CHECK_SESSION_ERROR');
      }
      setUser(null);
    } finally {
      if (msgId) removeLoadingMessage(msgId);
      setAuthContextLoading(false);
    }
  }, [addLoadingMessage, removeLoadingMessage, toast, user]);

  useEffect(() => {
    let mounted = true;
    setAuthContextLoading(true);
    const initialMsgId = addLoadingMessage("Initializing...");
    
    checkSession().then(() => {
       if (mounted) {
         removeLoadingMessage(initialMsgId);
         // setAuthContextLoading(false) is handled in checkSession
       }
    });

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Reset error on any successful sign in event
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
           setAuthError(null);
        }
        
        if (event === 'SIGNED_OUT') {
           setUser(null);
           setAuthError(null);
        } else if (session?.user) {
           setUser(session.user);
           
           // Handle post-login redirect (especially for Google OAuth)
           if (event === 'SIGNED_IN') {
             const storedRedirect = localStorage.getItem('postLoginRedirect');
             console.log('[AuthCore] SIGNED_IN event - checking redirect:', storedRedirect);
             if (storedRedirect) {
               localStorage.removeItem('postLoginRedirect');
               // Use setTimeout to ensure state updates complete before navigation
               setTimeout(() => {
                 window.location.href = storedRedirect;
               }, 100);
             }
           }
        }
      }
    );

    return () => {
      mounted = false;
      authListener?.unsubscribe();
    };
  }, []); // Run once on mount

  const login = useCallback(async (email, password) => {
    setAuthContextLoading(true);
    const loginMsgId = addLoadingMessage("Logging in...");
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      
      setUser(data.user);
      toast({ title: "Success", description: "Welcome back!" });
    } catch (error) {
      handleAuthError(error, "login");
      throw error;
    } finally {
      removeLoadingMessage(loginMsgId);
      setAuthContextLoading(false);
    }
  }, [toast, addLoadingMessage, removeLoadingMessage, handleAuthError]);

  const signup = useCallback(async (email, password, profileData) => {
    setAuthContextLoading(true);
    const signupMsgId = addLoadingMessage("Creating your account...");
    setAuthError(null);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            first_name: profileData.first_name,
            last_name: profileData.last_name
          }
        }
      });

      if (signUpError) throw signUpError;

      const newUser = signUpData.user;
      
      if (newUser) {
          setUser(newUser);
          if (newUser.id) {
             const { error: profileError } = await supabase
               .from('profiles')
               .upsert({
                 id: newUser.id,
                 email: email.toLowerCase(),
                 first_name: profileData.first_name,
                 last_name: profileData.last_name,
                 dob: profileData.dob,
                 user_type: profileData.user_type,
                 credits: 0,
                 created_at: new Date().toISOString(),
                 updated_at: new Date().toISOString()
               });

             if (profileError) console.error('Profile creation error:', profileError);
          }
          
          toast({
             title: "Account Created",
             description: "Your account has been created! Please check your email to verify your account.",
           });
      }

    } catch (error) {
      handleAuthError(error, "signup");
      throw error; 
    } finally {
      removeLoadingMessage(signupMsgId);
      setAuthContextLoading(false);
    }
  }, [toast, addLoadingMessage, removeLoadingMessage, handleAuthError]);

  const coreLogout = useCallback(async (options = { showToast: true, messageContext: "logout" }) => {
    setAuthContextLoading(true);
    const logoutMsgId = addLoadingMessage(`Logging out...`);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      if (options.showToast) {
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
      }
    } catch (error) {
      console.error(`[AuthCore] Logout error (${options.messageContext}):`, error);
    } finally {
      setUser(null); 
      setAuthError(null);
      removeLoadingMessage(logoutMsgId);
      setAuthContextLoading(false);
    }
  }, [toast, addLoadingMessage, removeLoadingMessage]);
  
  return {
    user,
    authContextLoading,
    authError,
    retryAuth: () => checkSession(true),
    login,
    signup,
    logout: coreLogout,
    _setUserRawCore: setUser, 
  };
};