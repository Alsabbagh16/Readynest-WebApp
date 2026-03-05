import React from 'react';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { AlertCircle } from 'lucide-react';

const PermissionGate = ({ 
  children, 
  permission, 
  showAccessDenied = false,
  fallback = null 
}) => {
  const { hasPerm, isSuperadmin, hasUiRoles, loading } = usePermissionContext();

  if (loading) return null; // Or a small spinner if critical

  // Logic:
  // 1. If Superadmin -> Allow
  // 2. If hasUiRoles is TRUE -> Strict Permission Check (must have permission)
  // 3. If hasUiRoles is FALSE -> Legacy Mode (Allow, unless explicit restrictions elsewhere, but here we treat as allowed if not gated strictly by other means)
  //    Wait, Task 2 says: "When hasUiRoles === false AND isSuperadmin === false, render children without permission checks"
  
  let canAccess = false;

  if (isSuperadmin) {
    canAccess = true;
  } else if (hasUiRoles) {
    // Strict mode for users with roles
    canAccess = permission ? hasPerm(permission) : true;
  } else {
    // Legacy mode for users without roles: Allow access
    canAccess = true;
  }

  if (canAccess) {
    return <>{children}</>;
  }

  if (showAccessDenied) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-gray-500 bg-gray-50 rounded-md border border-gray-200">
        <AlertCircle className="h-6 w-6 text-red-400 mb-2" />
        <p className="text-sm font-medium">Access Denied</p>
        <p className="text-xs">You need permission: <span className="font-mono text-red-500">{permission}</span></p>
      </div>
    );
  }

  return fallback;
};

export default PermissionGate;