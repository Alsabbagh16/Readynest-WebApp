import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';

const ContactDetails = ({ formData, setFormData, errors }) => {
  const { user, addresses } = useAuth();
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');

  // Pre-fill form if user is logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        // phone: prev.phone || user.phone || '', // Assuming phone might be in user profile later
      }));
    }
  }, [user, setFormData]);

  // Handle address selection change
  useEffect(() => {
    if (useSavedAddress && selectedAddressId) {
      const selectedAddr = addresses.find(addr => addr.id === selectedAddressId);
      if (selectedAddr) {
        setFormData(prev => ({
          ...prev,
          address: `${selectedAddr.street}, ${selectedAddr.city}, ${selectedAddr.state} ${selectedAddr.zip}`
        }));
      }
    } else if (!useSavedAddress) {
       // Clear address field if switching back to manual entry? Or keep it?
       // setFormData(prev => ({ ...prev, address: '' }));
    }
  }, [useSavedAddress, selectedAddressId, addresses, setFormData]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressSelectChange = (value) => {
      setSelectedAddressId(value);
      if (value === 'manual') {
          setUseSavedAddress(false);
          setFormData(prev => ({ ...prev, address: '' })); // Clear address field for manual entry
      } else {
          setUseSavedAddress(true);
          // Address field will be updated by the useEffect hook
      }
  };


  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Contact Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
           {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required />
         {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address-select">Service Address</Label>
        {user && addresses && addresses.length > 0 ? (
           <Select onValueChange={handleAddressSelectChange} defaultValue={selectedAddressId || 'manual'}>
             <SelectTrigger id="address-select">
               <SelectValue placeholder="Select saved address or enter manually" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="manual">Enter Address Manually</SelectItem>
               {addresses.map(addr => (
                 <SelectItem key={addr.id} value={addr.id}>
                   {addr.label ? `${addr.label} (${addr.street.substring(0,20)}...)` : `${addr.street}, ${addr.city}`}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
        ) : (
           <p className="text-sm text-muted-foreground">Enter service address below.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Street Address, City, State, Zip</Label>
        <Input
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            disabled={useSavedAddress} // Disable if a saved address is selected
            placeholder="e.g., 123 Main St, Anytown, CA 90210"
         />
         {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
      </div>
    </div>
  );
};

export default ContactDetails;