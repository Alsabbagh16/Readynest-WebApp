import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export const usePermissions = () => {
  const { adminUser } = useAdminAuth();
  const [permissions, setPermissions] = useState(new Set());
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [hasUiRoles, setHasUiRoles] = useState(false);
  const [assignedUiRoles, setAssignedUiRoles] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPermissions = useCallback(async () => {
    if (!adminUser) {
      setPermissions(new Set());
      setIsSuperadmin(false);
      setHasUiRoles(false);
      setAssignedUiRoles([]);
      setCurrentEmployee(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Employee Status (is_superadmin) and store full employee record
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', adminUser.id)
        .single();

      if (employeeError) throw employeeError;

      const isSuper = employeeData?.is_superadmin === true || employeeData?.role === 'superadmin';
      setIsSuperadmin(isSuper);
      setCurrentEmployee(employeeData);

      // 2. Fetch Assigned Roles & Permissions
      const { data: rolesData, error: rolesError } = await supabase
        .from('ui_employee_roles')
        .select(`
          role_id,
          ui_roles (
            id,
            name,
            mapped_backend_role,
            ui_role_permissions (
              ui_permissions (
                key
              )
            )
          )
        `)
        .eq('employee_id', adminUser.id);

      if (rolesError) throw rolesError;

      const permsSet = new Set();
      const rolesList = [];

      rolesData?.forEach(empRole => {
        if (empRole.ui_roles) {
          rolesList.push(empRole.ui_roles);
          empRole.ui_roles.ui_role_permissions?.forEach(rp => {
            if (rp.ui_permissions?.key) {
              permsSet.add(rp.ui_permissions.key);
            }
          });
        }
      });

      // Add hardcoded create customer permission if user has accounts.update_delete
      if (permsSet.has('accounts.update_delete')) {
        permsSet.add('accounts.create_customer');
      }

      setPermissions(permsSet);
      setAssignedUiRoles(rolesList);
      setHasUiRoles(rolesList.length > 0);

    } catch (err) {
      console.error("Error fetching permissions:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [adminUser]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPerm = useCallback((key) => {
    if (isSuperadmin) return true;
    return permissions.has(key);
  }, [isSuperadmin, permissions]);

  return {
    loading,
    error,
    isSuperadmin,
    hasUiRoles,
    assignedUiRoles,
    currentEmployee,
    permissions,
    hasPerm,
    refreshPermissions: fetchPermissions
  };
};