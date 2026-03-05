import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AddressForm from '@/components/Dashboard/AddressForm';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, PlusCircle, LogIn, UserPlus } from 'lucide-react';

const UserDetailsSection = ({ onAddressSelect, onGuestDetailsChange, currentSelectedAddressId, currentGuestDetails }) => {
  const { user, addresses, addAddress, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [internalSelectedAddressId, setInternalSelectedAddressId] = useState(currentSelectedAddressId);
  const [internalGuestDetails, setInternalGuestDetails] = useState(currentGuestDetails);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);

  useEffect(() => {
    setInternalSelectedAddressId(currentSelectedAddressId);
  }, [currentSelectedAddressId]);

  useEffect(() => {
    setInternalGuestDetails(currentGuestDetails);
  }, [currentGuestDetails]);

  useEffect(() => {
    if (user && addresses && addresses.length > 0 && !internalSelectedAddressId) {
      const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
      if (defaultAddress) {
        setInternalSelectedAddressId(defaultAddress.id);
        onAddressSelect(defaultAddress.id);
      }
    }
  }, [user, addresses, internalSelectedAddressId, onAddressSelect]);

  const handleLocalAddressSelect = (id) => {
    setInternalSelectedAddressId(id);
    onAddressSelect(id);
  };

  const handleLocalGuestDetailChange = (e) => {
    const newDetails = { ...internalGuestDetails, [e.target.name]: e.target.value };
    setInternalGuestDetails(newDetails);
    onGuestDetailsChange(newDetails);
  };
  
  const handleSaveNewAddress = async (addressData) => {
    const newAddress = await addAddress(addressData); // addAddress is from useAuth now
    if (newAddress) {
        handleLocalAddressSelect(newAddress.id);
        setIsAddressDialogOpen(false);
    }
  };

  if (authLoading) return <p className="text-muted-foreground text-center py-4">Loading user details...</p>;

  if (user) {
    return (
      <div className="space-y-4">
        <h4 className="text-xl font-semibold text-foreground mb-3 flex items-center dark:text-white">
          <User className="h-5 w-5 mr-2 text-primary" /> Logged in as {user.email}
        </h4>
        <div className="p-4 border border-border rounded-lg bg-background/70 space-y-3 dark:bg-slate-700/50 dark:border-slate-600">
          <Label htmlFor="selectedAddress" className="text-md font-medium text-foreground dark:text-slate-300">Select Service Address:</Label>
          {addresses && addresses.length > 0 ? (
            <div className="space-y-2">
              {addresses.map(addr => (
                <div 
                  key={addr.id} 
                  className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${internalSelectedAddressId === addr.id ? 'border-primary bg-primary/10 dark:bg-primary/20 dark:border-primary/70' : 'border-border hover:bg-muted/50 dark:border-slate-600 dark:hover:bg-slate-600/60'}`} 
                  onClick={() => handleLocalAddressSelect(addr.id)}
                >
                  <MapPin className="h-5 w-5 mr-3 text-primary/80 flex-shrink-0 dark:text-primary/90" />
                  <div>
                    <p className="font-medium text-foreground dark:text-slate-200">{addr.label || `${addr.street}`}</p>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">{addr.street}, {addr.city}, {addr.state} {addr.zip}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground dark:text-slate-400">No addresses found. Please add one.</p>
          )}
          <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-2 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Address
              </Button>
            </DialogTrigger>
            <DialogContent className="dark:bg-slate-800 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="dark:text-white">Add New Service Address</DialogTitle>
              </DialogHeader>
              <AddressForm 
                  onSave={handleSaveNewAddress} 
                  onCancel={() => setIsAddressDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  if (showGuestForm) {
    return (
      <div className="space-y-4">
        <h4 className="text-xl font-semibold text-foreground mb-3 dark:text-white">Guest Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-background/70 dark:bg-slate-700/50 dark:border-slate-600">
          <Input name="fullName" placeholder="Full Name" value={internalGuestDetails.fullName} onChange={handleLocalGuestDetailChange} required className="dark:bg-slate-800 dark:text-white dark:border-slate-700"/>
          <Input name="email" type="email" placeholder="Email" value={internalGuestDetails.email} onChange={handleLocalGuestDetailChange} required className="dark:bg-slate-800 dark:text-white dark:border-slate-700"/>
          <Input name="phone" type="tel" placeholder="Phone Number" value={internalGuestDetails.phone} onChange={handleLocalGuestDetailChange} required className="dark:bg-slate-800 dark:text-white dark:border-slate-700"/>
          <Input name="street" placeholder="Street Address" value={internalGuestDetails.street} onChange={handleLocalGuestDetailChange} required className="dark:bg-slate-800 dark:text-white dark:border-slate-700"/>
          <Input name="city" placeholder="City" value={internalGuestDetails.city} onChange={handleLocalGuestDetailChange} required className="dark:bg-slate-800 dark:text-white dark:border-slate-700"/>
          <Input name="state" placeholder="State" value={internalGuestDetails.state} onChange={handleLocalGuestDetailChange} required className="dark:bg-slate-800 dark:text-white dark:border-slate-700"/>
          <Input name="zip" placeholder="Zip Code" value={internalGuestDetails.zip} onChange={handleLocalGuestDetailChange} required className="dark:bg-slate-800 dark:text-white dark:border-slate-700"/>
        </div>
         <Button variant="link" onClick={() => setShowGuestForm(false)} className="text-sm text-primary dark:text-sky-400">Back to login options</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-background/70 dark:bg-slate-700/50 dark:border-slate-600">
      <h4 className="text-xl font-semibold text-foreground mb-3 text-center dark:text-white">Complete Your Booking</h4>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={() => navigate(`/auth?redirect=/book&step=summary&tab=login`)} className="flex-1 bg-primary hover:bg-primary/90 dark:bg-sky-600 dark:hover:bg-sky-500 dark:text-white">
          <LogIn className="mr-2 h-4 w-4" /> Login
        </Button>
        <Button variant="outline" onClick={() => navigate(`/auth?redirect=/book&step=summary&tab=register`)} className="flex-1 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600">
          <UserPlus className="mr-2 h-4 w-4" /> Register
        </Button>
      </div>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border dark:border-slate-600" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background/70 px-2 text-muted-foreground dark:bg-slate-700/50 dark:text-slate-400">Or</span>
        </div>
      </div>
      <Button variant="secondary" onClick={() => setShowGuestForm(true)} className="w-full dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200">
        Continue as Guest
      </Button>
    </div>
  );
};

export default UserDetailsSection;