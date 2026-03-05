export const BACKEND_ROLES = [
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
  { value: 'manager', label: 'Manager' }
];

export const getBackendRoleLabel = (value) => {
  const role = BACKEND_ROLES.find(r => r.value === value);
  return role ? role.label : value;
};