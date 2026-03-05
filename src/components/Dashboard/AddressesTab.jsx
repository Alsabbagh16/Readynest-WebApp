import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; 
import { PlusCircle, Edit, Trash2, Phone } from 'lucide-react';
import AddressForm from '@/components/Dashboard/AddressForm'; 

const AddressesTab = () => {
  const { addresses, addAddress, updateAddress, deleteAddress, loading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const handleSaveAddress = async (addressData) => {
    if (editingAddress) {
      await updateAddress(addressData.id, addressData);
    } else {
      await addAddress(addressData);
    }
    setIsDialogOpen(false);
    setEditingAddress(null);
  };

  const handleDeleteAddress = async (addressId) => {
     if (window.confirm("Are you sure you want to delete this address?")) {
        await deleteAddress(addressId);
     }
  };

  const openEditDialog = (address) => {
    setEditingAddress(address);
    setIsDialogOpen(true);
  };

   const openNewDialog = () => {
    setEditingAddress(null);
    setIsDialogOpen(true);
  };

  if (loading && !addresses.length) { 
    return <div className="p-6 text-center">Loading addresses...</div>;
  }

  return (
    <Card className="border-0 shadow-none rounded-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Saved Addresses</CardTitle>
          <CardDescription>Manage your saved addresses for faster booking.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
           if (!open) setEditingAddress(null);
           setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Address
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] dark:bg-slate-800 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {editingAddress ? 'Update the details for this address.' : 'Enter the details for the new address.'}
              </DialogDescription>
            </DialogHeader>
            <AddressForm
              address={editingAddress}
              onSave={handleSaveAddress}
              onCancel={() => { setIsDialogOpen(false); setEditingAddress(null); }}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="pt-6">
        {addresses && addresses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {addresses.map((addr) => (
              <Card key={addr.id} className="flex flex-col justify-between dark:bg-slate-700/50 dark:border-slate-600">
                <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
                   <CardTitle className="text-base font-semibold dark:text-slate-200">
                      {addr.label || `${addr.street.substring(0, 25)}${addr.street.length > 25 ? '...' : ''}`}
                   </CardTitle>
                   <div className="flex space-x-1">
                       <Button variant="ghost" size="icon" className="h-8 w-8 dark:text-slate-400 dark:hover:bg-slate-600 dark:hover:text-slate-200" onClick={() => openEditDialog(addr)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 dark:hover:text-red-400" onClick={() => handleDeleteAddress(addr.id)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                       </Button>
                   </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground dark:text-slate-400">
                    {addr.street}<br />
                    {addr.city}, {addr.state} {addr.zip}
                  </p>
                  {addr.phone && (
                    <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1 flex items-center">
                      <Phone className="h-3 w-3 mr-1.5" /> {addr.phone}
                    </p>
                  )}
                  {addr.alt_phone && (
                    <p className="text-xs text-muted-foreground dark:text-slate-400 mt-0.5 flex items-center">
                      <Phone className="h-3 w-3 mr-1.5" /> {addr.alt_phone} (Alt)
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">You haven't saved any addresses yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default AddressesTab;