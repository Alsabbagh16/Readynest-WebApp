import React, { createContext, useContext, useEffect, useCallback, useState, useMemo } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { useAuthCore } from '@/hooks/useAuthCore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserAddresses } from '@/hooks/useUserAddresses';

const AuthContext = createContext(null);

const useAuthenticationInternal = () => {
  const { 
    user, 
    authContextLoading: coreAuthLoading, 
    authError, // New export
    retryAuth, // New export
    login: coreLogin, 
    signup: coreSignup, 
    logout: coreLogout,
    _setUserRawCore 
  } = useAuthCore();
  return { user, coreAuthLoading, authError, retryAuth, coreLogin, coreSignup, coreLogout, _setUserRawCore };
};

const useProfileManagementInternal = (userId, initialProfile, initialCredits) => {
  const { 
    profile, 
    credits,
    loadingProfile, 
    fetchUserProfile, 
    updateUserProfile,
    updateCredits,
    resetProfile: resetUserProfileHook,
    setProfile: setUserProfileHook,
    setCredits: setUserCreditsHook,
  } = useUserProfile(userId, initialProfile, initialCredits);
  return { profile, credits, loadingProfile, fetchUserProfile, updateUserProfile, updateCredits, resetUserProfileHook, setUserProfileHook, setUserCreditsHook };
};

const useAddressManagementInternal = (userId) => {
  const { 
    addresses, 
    loadingAddresses, 
    fetchUserAddresses,
    addAddressHook,
    updateAddressHook,
    deleteAddressHook,
    resetAddresses: resetUserAddressesHook,
    setAddresses: setUserAddressesHook,
  } = useUserAddresses(userId);
  return { addresses, loadingAddresses, fetchUserAddresses, addAddressHook, updateAddressHook, deleteAddressHook, resetUserAddressesHook, setUserAddressesHook };
};


export const AuthProvider = ({ children }) => {
  const { user, coreAuthLoading, authError, retryAuth, coreLogin, coreSignup, coreLogout, _setUserRawCore } = useAuthenticationInternal();
  const { profile, credits, loadingProfile, fetchUserProfile, updateUserProfile, updateCredits, resetUserProfileHook, setUserProfileHook, setUserCreditsHook } = useProfileManagementInternal(user?.id, null, 0);
  const { addresses, loadingAddresses, fetchUserAddresses, addAddressHook, updateAddressHook, deleteAddressHook, resetUserAddressesHook, setUserAddressesHook } = useAddressManagementInternal(user?.id);
  
  const { toast } = useToast();
  const [isOverallLoading, setIsOverallLoading] = useState(true);

  const resetUserSpecificData = useCallback(() => {
    resetUserProfileHook();
    resetUserAddressesHook();
  }, [resetUserProfileHook, resetUserAddressesHook]);

  useEffect(() => {
    let timeoutId;
    if (user && user.email_confirmed_at && !coreAuthLoading && !loadingProfile) {
      timeoutId = setTimeout(() => {
        if (!profile) {
          toast({
            title: "Profile Issue",
            description: "Your user profile could not be loaded. Logging you out. Please log in again or contact support.",
            variant: "destructive",
          });
          coreLogout({ showToast: false, messageContext: "profile_missing_auto_logout" }); 
          resetUserSpecificData(); 
          if (_setUserRawCore) {
            _setUserRawCore(null); 
          }
        }
      }, 1000);
    }
    return () => clearTimeout(timeoutId);
  }, [user, profile, coreAuthLoading, loadingProfile, coreLogout, toast, resetUserSpecificData, _setUserRawCore]);
  
  useEffect(() => {
    if (user === null && !coreAuthLoading) { 
        resetUserSpecificData();
    }
  }, [user, coreAuthLoading, resetUserSpecificData]);

  useEffect(() => {
    const newOverallLoadingState = 
      user === undefined || 
      coreAuthLoading || 
      (user !== null && loadingProfile) || 
      (user !== null && profile !== null && loadingAddresses);
    
    if (isOverallLoading !== newOverallLoadingState) {
        setIsOverallLoading(newOverallLoadingState);
    }
  }, [user, coreAuthLoading, loadingProfile, profile, loadingAddresses, isOverallLoading]);

  const contextValue = useMemo(() => ({
    user, 
    profile,
    credits,
    addresses,
    loading: isOverallLoading, 
    authContextLoading: coreAuthLoading, 
    authError, // Exposed
    retryAuth, // Exposed
    loadingProfile,
    loadingAddresses,
    login: coreLogin,
    signup: coreSignup,
    logout: coreLogout,
    updateProfile: updateUserProfile,
    addAddress: addAddressHook,
    updateAddress: updateAddressHook,
    deleteAddress: deleteAddressHook,
    updateUserCredits: updateCredits,
    fetchUserProfile, 
    fetchUserAddresses,
    _setUserRaw: _setUserRawCore, 
    _setProfileRaw: setUserProfileHook,
    _setCreditsRaw: setUserCreditsHook,
    _setAddressesRaw: setUserAddressesHook,
  }), [
    user, profile, credits, addresses, isOverallLoading, coreAuthLoading, authError, retryAuth, loadingProfile, loadingAddresses,
    coreLogin, coreSignup, coreLogout, updateUserProfile, addAddressHook, updateAddressHook, deleteAddressHook,
    updateCredits, fetchUserProfile, fetchUserAddresses, _setUserRawCore, setUserProfileHook, setUserCreditsHook, setUserAddressesHook
  ]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};