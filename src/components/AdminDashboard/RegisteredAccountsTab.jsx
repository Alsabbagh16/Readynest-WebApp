import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, adminUpdateUserProfile, deleteUser } from '@/lib/storage/userStorage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Edit, Trash2, ShieldAlert, Phone, UserPlus, Users, Search } from 'lucide-react';
import { format } from 'date-fns';
import EditUserForm from '@/components/AdminDashboard/EditUserForm';
import CreateCustomerForm from '@/components/AdminDashboard/CreateCustomerForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { usePermissions } from '@/hooks/usePermissions';

const RegisteredAccountsTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { adminProfile } = useAdminAuth();
  const { hasPerm } = usePermissions();

  const canEditUsers = adminProfile && (adminProfile.role === 'admin' || adminProfile.role === 'superadmin');
  const canCreateCustomers = hasPerm('accounts.create_customer');

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.includes(query) ||
      user.user_type?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      toast({ title: "Error", description: `Could not fetch users: ${error.message}`, variant: "destructive" });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (userData) => {
    if (!canEditUsers) {
        toast({ title: "Permission Denied", description: "You do not have permission to edit users.", variant: "destructive" });
        return;
    }
    try {
      await adminUpdateUserProfile(userData.id, userData);
      toast({ title: "User Updated", description: `Details for ${userData.email} saved.` });
      setIsDialogOpen(false);
      setEditingUser(null);
      fetchUsers(); 
    } catch (error) {
      toast({ title: "Error", description: `Could not update user: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!canEditUsers) {
        toast({ title: "Permission Denied", description: "You do not have permission to delete users.", variant: "destructive" });
        return;
    }
     if (window.confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
        try {
            await deleteUser(userId); 
            toast({ title: "User Deleted", description: `${userEmail} removed.` });
            fetchUsers(); 
        } catch (error) {
            toast({ title: "Error", description: `Could not delete user: ${error.message}`, variant: "destructive" });
        }
     }
  };

  const openEditDialog = (user) => {
    if (!canEditUsers) {
        toast({ title: "Permission Denied", description: "You do not have permission to edit users.", variant: "destructive" });
        return;
    }
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleCreateCustomerSuccess = () => {
    setIsCreateModalOpen(false);
    fetchUsers();
  };

  if (loading) {
    return <div className="p-6">Loading registered accounts...</div>;
  }

  return (
    <Card className="border-0 shadow-none rounded-none">
      <CardHeader className="flex flex-col space-y-4 pb-2">
        <div className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center text-2xl font-bold">
              <Users className="mr-3 h-7 w-7 text-primary" />
              Registered Accounts
            </CardTitle>
            <CardDescription>View and manage all customer accounts.</CardDescription>
          </div>
          
          {canCreateCustomers && (
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              <UserPlus className="mr-2 h-4 w-4" /> Create Customer
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {!canEditUsers && (
          <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md flex items-center">
            <ShieldAlert className="h-5 w-5 mr-2" />
            <p className="text-sm">Your role does not permit editing or deleting user accounts.</p>
          </div>
        )}
        
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or user type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-1">
              Found {filteredUsers.length} of {users.length} users
            </p>
          )}
        </div>
        
        {filteredUsers.length === 0 && users.length > 0 ? (
          <p>No users found matching "{searchQuery}".</p>
        ) : users.length === 0 ? (
          <p>No registered users found.</p>
        ) : (
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>User Type</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Joined</TableHead>
                  {canEditUsers && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                       <Link to={`/admin-dashboard/user/${user.id}`} className="text-blue-600 hover:underline">
                          {user.name || user.email}
                       </Link>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="flex items-center">
                      {user.phone ? <Phone className="h-3 w-3 mr-1 text-muted-foreground" /> : null}
                      {user.phone || 'N/A'}
                    </TableCell>
                    <TableCell>{user.user_type || 'Personal'}</TableCell>
                    <TableCell>{user.credits || 0}</TableCell>
                    <TableCell>{user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                    {canEditUsers && (
                      <TableCell className="space-x-1 whitespace-nowrap">
                          <Dialog open={isDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                              if (!open) {
                                  setEditingUser(null);
                                  setIsDialogOpen(false); 
                              } else if (editingUser?.id === user.id) {
                              setIsDialogOpen(open);
                              }
                          }}>
                          <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} disabled={!canEditUsers}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                              </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg">
                              <DialogHeader>
                              <DialogTitle>Edit User</DialogTitle>
                              <DialogDescription>
                                  Update the details for {editingUser?.email}.
                              </DialogDescription>
                              </DialogHeader>
                              {editingUser && (
                                  <EditUserForm
                                  user={editingUser}
                                  onSave={handleSaveUser}
                                  onCancel={() => { setIsDialogOpen(false); setEditingUser(null); }}
                                  />
                              )}
                          </DialogContent>
                          </Dialog>

                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-100" onClick={() => handleDeleteUser(user.id, user.email)} disabled={!canEditUsers}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                          </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
              <DialogDescription>
                Register a new customer account. The customer will be able to login with these credentials.
              </DialogDescription>
            </DialogHeader>
            <CreateCustomerForm 
              onSuccess={handleCreateCustomerSuccess}
              onCancel={() => setIsCreateModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default RegisteredAccountsTab;