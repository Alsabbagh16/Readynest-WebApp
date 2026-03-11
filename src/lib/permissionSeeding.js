import { supabase } from '@/lib/supabase';

const REQUIRED_PERMISSIONS = [
  { key: 'jobs.view_all', description: 'View all jobs (not just assigned).', module: 'jobs' },
  { key: 'purchases.view_all', description: 'View all purchases (not just assigned/owned).', module: 'purchases' },
  { key: 'tab.manage_roles.view', description: 'Access to Manage Roles page', module: 'settings' },
  { key: 'employees.view', description: 'View employees list', module: 'employees' },
  { key: 'employees.create', description: 'Create/Edit employees', module: 'employees' },
  { key: 'jobs.create', description: 'Create jobs', module: 'jobs' },
  { key: 'jobs.edit', description: 'Edit jobs', module: 'jobs' },
  { key: 'purchases.create', description: 'Create purchases', module: 'purchases' },
  { key: 'purchases.edit', description: 'Edit purchases', module: 'purchases' },
  { key: 'invoices.create', description: 'Create invoices', module: 'purchases' },
  { key: 'products.create', description: 'Manage products and services', module: 'products' },
  { key: 'addons_templates.create', description: 'Manage addons', module: 'products' },
  { key: 'coupons.create', description: 'Manage coupons', module: 'coupons' },
  { key: 'accounts.create_customer', description: 'Create new customer accounts', module: 'accounts' },
  { key: 'accounts.update_delete', description: 'Manage registered user accounts', module: 'accounts' },
  { key: 'roles.manage', description: 'Manage RBAC roles', module: 'settings' },
  { key: 'tab.recent_purchases.view', description: 'View Recent Purchases tab', module: 'purchases' },
  { key: 'tab.jobs_list.view', description: 'View Jobs List tab', module: 'jobs' },
  { key: 'tab.employees.view', description: 'View Employees tab', module: 'employees' },
  { key: 'tab.registered_accounts.view', description: 'View Registered Accounts tab', module: 'accounts' },
  { key: 'tab.services_products.view', description: 'View Services & Products tab', module: 'products' },
  { key: 'tab.coupons.view', description: 'View Coupons tab', module: 'coupons' },
  { key: 'tab.customize_website.view', description: 'View Website Customization tab', module: 'settings' }
];

export const seedPermissions = async () => {
  try {
    console.log('Seeding permissions...');
    
    // We can't use bulk upsert easily with key conflict in all postgres versions via simple API, 
    // but we can iterate or use upsert if the constraint is set. 
    // Assuming 'key' is unique.
    
    const { data, error } = await supabase
      .from('ui_permissions')
      .upsert(REQUIRED_PERMISSIONS, { onConflict: 'key' });

    if (error) throw error;
    
    console.log('Permissions seeded successfully.');
    return { success: true };
  } catch (error) {
    console.error('Error seeding permissions:', error);
    return { success: false, error };
  }
};