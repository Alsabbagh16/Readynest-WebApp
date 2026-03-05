
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

const ManualAddressForm = ({ onCancel, onChange, onManualPhoneChange, defaultValues = {} }) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    label: defaultValues.label || '',
    fullName: defaultValues.fullName || '',
    phone: defaultValues.phone || '',
    city: defaultValues.city || '',
    street: defaultValues.street || '',
    apartment: defaultValues.apartment || '',
    notes: defaultValues.notes || '',
    saveForLater: defaultValues.saveForLater || false
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    validateForm();
    onChange(formData, isValid());
    if (onManualPhoneChange) {
      onManualPhoneChange(formData.phone);
    }
  }, [formData]);

  const isValid = () => {
    return formData.city.trim() !== '' && formData.street.trim() !== '' && formData.phone.trim() !== '';
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.city.trim()) newErrors.city = "City/Area is required";
    if (!formData.street.trim()) newErrors.street = "Street address is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    setErrors(newErrors);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4 bg-muted/30 p-4 md:p-6 rounded-lg border border-border">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Enter Address Details</h3>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="street">Street Address <span className="text-red-500">*</span></Label>
          <Input 
            id="street" 
            value={formData.street} 
            onChange={(e) => handleChange('street', e.target.value)} 
            placeholder="House/Building No., Street Name"
            className={errors.street ? "border-red-500" : ""}
          />
          {errors.street && <p className="text-xs text-red-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/>{errors.street}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Area/City <span className="text-red-500">*</span></Label>
          <Input 
            id="city" 
            value={formData.city} 
            onChange={(e) => handleChange('city', e.target.value)} 
            placeholder="e.g., Manama, Juffair"
            className={errors.city ? "border-red-500" : ""}
          />
          {errors.city && <p className="text-xs text-red-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/>{errors.city}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="apartment">Apartment/Villa No. (Optional)</Label>
          <Input 
            id="apartment" 
            value={formData.apartment} 
            onChange={(e) => handleChange('apartment', e.target.value)} 
            placeholder="e.g., Apt 12, Villa 5"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Contact Phone <span className="text-red-500">*</span></Label>
          <Input 
            id="phone" 
            value={formData.phone} 
            onChange={(e) => handleChange('phone', e.target.value)} 
            placeholder="Phone number for this location"
            className={errors.phone ? "border-red-500" : ""}
          />
          {errors.phone && <p className="text-xs text-red-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/>{errors.phone}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">Address Label (Optional)</Label>
          <Input 
            id="label" 
            value={formData.label} 
            onChange={(e) => handleChange('label', e.target.value)} 
            placeholder="e.g., Home, Office"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="fullName">Contact Name (Optional)</Label>
          <Input 
            id="fullName" 
            value={formData.fullName} 
            onChange={(e) => handleChange('fullName', e.target.value)} 
            placeholder="Name of person at this address"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes for Cleaner (Optional)</Label>
          <Input 
            id="notes" 
            value={formData.notes} 
            onChange={(e) => handleChange('notes', e.target.value)} 
            placeholder="e.g., Gate code is 1234, Call upon arrival"
          />
        </div>
      </div>

      {user && (
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox 
            id="saveForLater" 
            checked={formData.saveForLater} 
            onCheckedChange={(checked) => handleChange('saveForLater', checked)}
          />
          <Label htmlFor="saveForLater" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Save this address for next time
          </Label>
        </div>
      )}
    </div>
  );
};

export default ManualAddressForm;
