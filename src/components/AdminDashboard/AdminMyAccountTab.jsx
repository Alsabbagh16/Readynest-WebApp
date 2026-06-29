import React from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import AdminEmployeeProfilePage from '@/pages/AdminEmployeeProfilePage';

const AdminMyAccountTab = () => {
  const { adminProfile } = useAdminAuth();

  if (!adminProfile?.id) {
    return <div className="p-6 text-sm text-slate-500">Loading account details...</div>;
  }

  return <AdminEmployeeProfilePage employeeId={adminProfile.id} selfService />;
};

export default AdminMyAccountTab;
