import React, { createContext, useContext } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
  const permissionData = usePermissions();
  return (
    <PermissionContext.Provider value={permissionData}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissionContext = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissionContext must be used within a PermissionProvider');
  }
  return context;
};