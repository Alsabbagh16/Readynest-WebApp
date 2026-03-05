import React from 'react';
import ManageRolesTab from '@/components/AdminDashboard/ManageRolesTab';
import PermissionGate from '@/components/PermissionGate';

const ManageRolesPage = () => {
  return (
    <PermissionGate permission="roles.manage" showAccessDenied>
      <ManageRolesTab />
    </PermissionGate>
  );
};

export default ManageRolesPage;