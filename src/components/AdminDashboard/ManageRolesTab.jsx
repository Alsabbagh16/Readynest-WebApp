import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/components/ui/use-toast';
import { BACKEND_ROLES, getBackendRoleLabel } from '@/lib/backendRoles';
import { Loader2, Shield, Plus, Edit2, Trash2, Users, CheckSquare, Square, UserCog, UserMinus } from 'lucide-react';
import { getEmployees, updateEmployee } from '@/lib/storage/employeeStorage';

const ManageRolesTab = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignedUsersLoading, setAssignedUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  // Role Dialog States
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', mapped_backend_role: '', permissions: [] });

  // User Assignment Dialog States
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ employee_id: '', role_ids: [] });
  const [editingEmployeeForRoles, setEditingEmployeeForRoles] = useState(null);

  // Users Data for "Assigned Users" table
  const [usersWithRoles, setUsersWithRoles] = useState([]);

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Roles with Permissions
      const { data: rolesData, error: rolesError } = await supabase
        .from('ui_roles')
        .select(`*, ui_role_permissions(permission_id)`)
        .order('created_at');
      if (rolesError) throw rolesError;

      // Fetch All Permissions
      const { data: permsData, error: permsError } = await supabase
        .from('ui_permissions')
        .select('*')
        .order('module');
      if (permsError) throw permsError;

      // Add hardcoded create customer permission
      const allPermissions = [
        ...permsData,
        {
          id: 'accounts_create_customer',
          key: 'accounts.create_customer',
          description: 'Create new customer accounts',
          module: 'accounts'
        }
      ];

      // Fetch Employees
      const fetchedEmployees = await getEmployees();

      setRoles(rolesData);
      setPermissions(allPermissions);
      setEmployees(fetchedEmployees);
      
      // Fetch Users with assigned roles
      await fetchUsersWithRoles(fetchedEmployees);

    } catch (err) {
      console.error("Error fetching RBAC data:", err);
      toast({ title: "Error", description: "Failed to load roles and permissions.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersWithRoles = async (currentEmployees) => {
    setAssignedUsersLoading(true);
    try {
       const { data, error } = await supabase
        .from('ui_employee_roles')
        .select('employee_id, role_id, ui_roles(id, name, mapped_backend_role)');
       
       if (error) throw error;

       // Group roles by employee
       const rolesByEmployee = {};
       data.forEach(item => {
          if (!rolesByEmployee[item.employee_id]) {
             rolesByEmployee[item.employee_id] = [];
          }
          if (item.ui_roles) {
            rolesByEmployee[item.employee_id].push(item.ui_roles);
          }
       });

       // Merge with employee details
       const users = currentEmployees.map(emp => ({
          ...emp,
          ui_roles: rolesByEmployee[emp.id] || []
       }));

       setUsersWithRoles(users);

    } catch (err) {
        console.error("Error fetching user roles:", err);
    } finally {
        setAssignedUsersLoading(false);
    }
  };

  // --- Role Management ---

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '', mapped_backend_role: '', permissions: [] });
    setIsRoleDialogOpen(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    const rolePerms = role.ui_role_permissions.map(rp => rp.permission_id);
    
    // Check if this role should have the hardcoded create customer permission
    // For now, we'll add it if the role has any accounts permissions
    const hasCreateCustomer = rolePerms.some(pid => {
      const perm = permissions.find(p => p.id === pid);
      return perm && perm.module === 'accounts' && perm.key === 'accounts.update_delete';
    });
    
    const allPerms = hasCreateCustomer ? [...rolePerms, 'accounts_create_customer'] : rolePerms;
    
    setRoleForm({ 
      name: role.name, 
      description: role.description || '', 
      mapped_backend_role: role.mapped_backend_role || '',
      permissions: allPerms 
    });
    setIsRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name) {
      toast({ title: "Validation Error", description: "Role name is required.", variant: "destructive" });
      return;
    }

    try {
      let roleId;
      if (editingRole) {
        const { error } = await supabase.from('ui_roles').update({
            name: roleForm.name,
            description: roleForm.description,
            mapped_backend_role: roleForm.mapped_backend_role || null
          }).eq('id', editingRole.id);
        if (error) throw error;
        roleId = editingRole.id;
      } else {
        const { data, error } = await supabase.from('ui_roles').insert({
            name: roleForm.name,
            description: roleForm.description,
            mapped_backend_role: roleForm.mapped_backend_role || null
          }).select().single();
        if (error) throw error;
        roleId = data.id;
      }

      await supabase.from('ui_role_permissions').delete().eq('role_id', roleId);
      
      // Only save database permissions (filter out hardcoded permissions)
      const dbPermissions = roleForm.permissions.filter(pid => pid !== 'accounts_create_customer');
      
      if (dbPermissions.length > 0) {
        const permInserts = dbPermissions.map(pid => ({ role_id: roleId, permission_id: pid }));
        const { error: permError } = await supabase.from('ui_role_permissions').insert(permInserts);
        if (permError) throw permError;
      }

      toast({ title: "Success", description: "Role saved successfully." });
      setIsRoleDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error("Error saving role:", err);
      toast({ title: "Error", description: "Failed to save role.", variant: "destructive" });
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm("Are you sure? This will remove this role from all employees.")) return;
    try {
      const { error } = await supabase.from('ui_roles').delete().eq('id', roleId);
      if (error) throw error;
      toast({ title: "Deleted", description: "Role deleted." });
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete role.", variant: "destructive" });
    }
  };

  const togglePermission = (permId) => {
    setRoleForm(prev => {
      const exists = prev.permissions.includes(permId);
      return {
        ...prev,
        permissions: exists ? prev.permissions.filter(p => p !== permId) : [...prev.permissions, permId]
      };
    });
  };

  // --- User Assignment Management ---

  const handleEditUserRoles = (employee) => {
     setEditingEmployeeForRoles(employee);
     setAssignForm({
        employee_id: employee.id,
        role_ids: employee.ui_roles.map(r => r.id)
     });
     setIsAssignDialogOpen(true);
  };

  const handleRevokeAll = async (employee) => {
     if (!window.confirm(`Are you sure you want to revoke ALL UI roles for ${employee.full_name}?`)) return;
     try {
        const { error } = await supabase.from('ui_employee_roles').delete().eq('employee_id', employee.id);
        if (error) throw error;
        toast({ title: "Revoked", description: `All roles removed for ${employee.full_name}.` });
        fetchData(); // Refresh table
     } catch (err) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
     }
  };

  const handleSaveAssignment = async () => {
    if (!assignForm.employee_id) return;

    try {
        // Validate Mapped Backend Roles
        const selectedRoles = roles.filter(r => assignForm.role_ids.includes(r.id));
        const mappedRoles = selectedRoles
            .map(r => r.mapped_backend_role)
            .filter(r => r); 
        
        const uniqueMappedRoles = [...new Set(mappedRoles)];

        if (uniqueMappedRoles.length > 1) {
            toast({ 
                title: "Conflict Error", 
                description: `Cannot assign conflicting backend roles: ${uniqueMappedRoles.join(', ')}. Please select UI roles that map to a single backend role (or none).`, 
                variant: "destructive" 
            });
            return;
        }

        // Save UI Roles
        await supabase.from('ui_employee_roles').delete().eq('employee_id', assignForm.employee_id);
        
        if (assignForm.role_ids.length > 0) {
            const inserts = assignForm.role_ids.map(rid => ({ employee_id: assignForm.employee_id, role_id: rid }));
            const { error } = await supabase.from('ui_employee_roles').insert(inserts);
            if (error) throw error;
        }

        // Update Backend Role
        if (uniqueMappedRoles.length === 1) {
            const newBackendRole = uniqueMappedRoles[0];
            const employee = employees.find(e => e.id === assignForm.employee_id);
            if (employee && employee.role !== newBackendRole) {
                 await updateEmployee({ ...employee, role: newBackendRole });
                 toast({ title: "Backend Role Updated", description: `Employee updated to '${newBackendRole}'.` });
            }
        }

        toast({ title: "Success", description: "Roles assigned successfully." });
        setIsAssignDialogOpen(false);
        fetchData();
    } catch (err) {
        console.error("Assignment error:", err);
        toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Permission Grouping
  const jobsPermissions = ['jobs.create', 'jobs.edit', 'jobs.view_all'];
  const purchasesPermissions = ['purchases.create', 'purchases.edit', 'purchases.view_all'];

  const permsByModule = permissions.reduce((acc, perm) => {
    let group = perm.module || 'Other';
    // Custom grouping override for specific keys
    if (jobsPermissions.includes(perm.key)) group = 'Jobs';
    if (purchasesPermissions.includes(perm.key)) group = 'Purchases';

    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {});

  const filteredUsers = usersWithRoles.filter(u => 
    (u.full_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary"/></div>;

  return (
    <div className="space-y-8">
      {/* SECTION 1: Role Definitions */}
      <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold flex items-center"><Shield className="mr-2 h-6 w-6"/> Defined Roles</h2>
              <p className="text-sm text-gray-500">Configure roles and their permissions.</p>
            </div>
            <Button onClick={handleCreateRole}><Plus className="mr-2 h-4 w-4"/> Create Role</Button>
          </div>

          <div className="border rounded-md bg-white">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Backend Mapping</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {roles.map(role => (
                        <TableRow key={role.id}>
                            <TableCell className="font-medium">{role.name}</TableCell>
                            <TableCell>{role.description}</TableCell>
                            <TableCell>
                                {role.mapped_backend_role ? (
                                    <Badge variant="outline">{getBackendRoleLabel(role.mapped_backend_role)}</Badge>
                                ) : <span className="text-gray-400 text-xs italic">None</span>}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button size="sm" variant="ghost" onClick={() => handleEditRole(role)}><Edit2 className="h-4 w-4"/></Button>
                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteRole(role.id)}><Trash2 className="h-4 w-4"/></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
      </div>

      {/* SECTION 2: Assigned Users */}
      <div className="space-y-4 pt-6 border-t">
          <div className="flex justify-between items-center">
             <div>
               <h2 className="text-xl font-bold flex items-center"><Users className="mr-2 h-6 w-6"/> Assigned Users</h2>
               <p className="text-sm text-gray-500">Manage which employees have which roles.</p>
             </div>
             <div className="w-64">
                <Input 
                   placeholder="Search employees..." 
                   value={userSearchTerm} 
                   onChange={(e) => setUserSearchTerm(e.target.value)}
                />
             </div>
          </div>
          
          <div className="border rounded-md bg-white overflow-hidden">
             <Table>
                <TableHeader>
                   <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Current UI Roles</TableHead>
                      <TableHead>Backend Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {assignedUsersLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8">Loading users...</TableCell></TableRow>
                   ) : filteredUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No employees found.</TableCell></TableRow>
                   ) : (
                      filteredUsers.map(user => (
                         <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                            <TableCell className="text-sm text-gray-500">
                                <div>{user.email}</div>
                                {user.mobile && <div>{user.mobile}</div>}
                            </TableCell>
                            <TableCell>
                               <div className="flex flex-wrap gap-1">
                                  {user.ui_roles && user.ui_roles.length > 0 ? (
                                     user.ui_roles.map(r => (
                                        <Badge key={r.id} variant="secondary" className="text-xs">{r.name}</Badge>
                                     ))
                                  ) : (
                                     <span className="text-gray-400 text-xs italic">No roles assigned</span>
                                  )}
                               </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">{getBackendRoleLabel(user.role) || user.role}</Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                               <Button size="sm" variant="outline" onClick={() => handleEditUserRoles(user)} title="Edit Roles">
                                  <UserCog className="h-4 w-4"/>
                               </Button>
                               <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50" 
                                  onClick={() => handleRevokeAll(user)}
                                  title="Revoke All Roles"
                                  disabled={!user.ui_roles || user.ui_roles.length === 0}
                               >
                                  <UserMinus className="h-4 w-4"/>
                               </Button>
                            </TableCell>
                         </TableRow>
                      ))
                   )}
                </TableBody>
             </Table>
          </div>
      </div>

      {/* Dialogs */}
      
      {/* Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Role Name</Label>
                        <Input value={roleForm.name} onChange={e => setRoleForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Sales Manager" />
                    </div>
                    <div>
                        <Label>Mapped Backend Role (Optional)</Label>
                        <Select 
                            value={roleForm.mapped_backend_role} 
                            onValueChange={val => setRoleForm(prev => ({ ...prev, mapped_backend_role: val === 'none' ? '' : val }))}
                        >
                            <SelectTrigger><SelectValue placeholder="Select backend role..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None (Pure UI Role)</SelectItem>
                                {BACKEND_ROLES.map(r => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-gray-500 mt-1">Updates the employee's core system role when assigned.</p>
                    </div>
                </div>
                <div>
                    <Label>Description</Label>
                    <Input value={roleForm.description} onChange={e => setRoleForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Description of this role..." />
                </div>
                
                <div className="space-y-4 mt-2 border-t pt-4">
                    <Label className="text-base">Permissions</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(permsByModule).map(([module, perms]) => (
                            <div key={module} className="border p-3 rounded-md">
                                <h4 className="font-semibold capitalize mb-2 border-b pb-1">{module}</h4>
                                <div className="space-y-2">
                                    {perms.map(perm => {
                                        const isSelected = roleForm.permissions.includes(perm.id);
                                        return (
                                            <div key={perm.id} className="flex items-start space-x-2" onClick={() => togglePermission(perm.id)}>
                                                <div className={`cursor-pointer mt-0.5 ${isSelected ? 'text-primary' : 'text-gray-300'}`}>
                                                    {isSelected ? <CheckSquare className="h-5 w-5"/> : <Square className="h-5 w-5"/>}
                                                </div>
                                                <div className="cursor-pointer">
                                                    <p className="text-sm font-medium leading-none">{perm.description || perm.key}</p>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{perm.key}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveRole}>Save Role</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Assign Roles to {editingEmployeeForRoles?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Select Roles</Label>
                    <div className="space-y-2 border p-3 rounded-md max-h-[300px] overflow-y-auto">
                        {roles.map(role => {
                            const isAssigned = assignForm.role_ids.includes(role.id);
                            return (
                                <div 
                                    key={role.id} 
                                    className={`flex items-center space-x-2 p-3 rounded cursor-pointer border ${isAssigned ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
                                    onClick={() => setAssignForm(prev => {
                                        const newIds = isAssigned 
                                            ? prev.role_ids.filter(id => id !== role.id)
                                            : [...prev.role_ids, role.id];
                                        return { ...prev, role_ids: newIds };
                                    })}
                                >
                                    {isAssigned ? <CheckSquare className="h-5 w-5 text-primary"/> : <Square className="h-5 w-5 text-gray-300"/>}
                                    <div className="flex-1">
                                        <div className="font-medium flex items-center">
                                            {role.name}
                                            {role.mapped_backend_role && <Badge variant="secondary" className="ml-2 text-[10px] h-5">{role.mapped_backend_role}</Badge>}
                                        </div>
                                        <div className="text-xs text-gray-500">{role.description}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveAssignment}>Save Assignments</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageRolesTab;