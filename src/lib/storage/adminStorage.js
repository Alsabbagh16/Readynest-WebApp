// This file is largely deprecated as admin session and profile
// should be managed via Supabase Auth and the 'employees' or a dedicated 'admin_profiles' table.

// The functions saveAdminProfile, getAdminProfile, removeAdminProfile
// were for localStorage-based admin session management which is being phased out.
// Kept for reference during transition, can be deleted once AdminAuthContext fully relies on Supabase.

export const saveAdminProfile = (profile) => {
  // console.warn("Legacy saveAdminProfile called. This should be handled by Supabase session.");
  if (profile) {
      // Using a different key to avoid conflict during transition
      localStorage.setItem('readynest_admin_profile_temp', JSON.stringify(profile));
  } else {
      localStorage.removeItem('readynest_admin_profile_temp');
  }
};

export const getAdminProfile = () => {
  // console.warn("Legacy getAdminProfile called. This should be handled by Supabase session.");
  const profile = localStorage.getItem('readynest_admin_profile_temp');
  return profile ? JSON.parse(profile) : null;
};

export const removeAdminProfile = () => {
  // console.warn("Legacy removeAdminProfile called. This should be handled by Supabase session.");
  localStorage.removeItem('readynest_admin_profile_temp');
};