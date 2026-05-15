
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import MapLocationPicker from './MapLocationPicker';

const ManualAddressForm = ({ onCancel, onChange, onManualPhoneChange, defaultValues = {}, t = (key) => key }) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    label: defaultValues.label || '',
    fullName: defaultValues.fullName || '',
    email: defaultValues.email || '',
    phone: defaultValues.phone || '',
    city: defaultValues.city || '',
    street: defaultValues.street || '',
    apartment: defaultValues.apartment || '',
    notes: defaultValues.notes || '',
    saveForLater: defaultValues.saveForLater || false,
    lat: defaultValues.lat || null,
    lng: defaultValues.lng || null
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
    return formData.city.trim() !== '' && formData.street.trim() !== '' && formData.phone.trim() !== '' && formData.fullName.trim() !== '' && formData.apartment.trim() !== '';
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.city.trim()) newErrors.city = t('form.cityRequired');
    if (!formData.street.trim()) newErrors.street = t('form.streetRequired');
    if (!formData.apartment.trim()) newErrors.apartment = t('form.apartmentRequired');
    if (!formData.phone.trim()) newErrors.phone = t('form.phoneRequired');
    if (!formData.fullName.trim()) newErrors.fullName = t('form.fullNameRequired');
    setErrors(newErrors);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (locationData) => {
    setFormData(prev => ({
      ...prev,
      street: locationData.street || prev.street,
      city: locationData.city || locationData.area || prev.city,
      lat: locationData.lat,
      lng: locationData.lng
    }));
  };

  return (
    <div className="space-y-4 bg-muted/30 p-4 md:p-6 rounded-lg border border-border">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">{t('form.addressDetails')}</h3>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>{t('form.cancel')}</Button>
        )}
      </div>

      {/* Map Location Picker */}
      <MapLocationPicker 
        onLocationSelect={handleLocationSelect}
        initialLocation={formData.lat && formData.lng ? { lat: formData.lat, lng: formData.lng } : null}
        t={t}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="street">{t('form.locationAddress')} <span className="text-red-500">*</span></Label>
          <Input 
            id="street" 
            value={formData.street} 
            onChange={(e) => handleChange('street', e.target.value)} 
            placeholder={t('form.streetPlaceholder')}
            className={errors.street ? "border-red-500" : ""}
          />
          {errors.street && <p className="text-xs text-red-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/>{errors.street}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">{t('form.areaCity')} <span className="text-red-500">*</span></Label>
          <Input 
            id="city" 
            value={formData.city} 
            onChange={(e) => handleChange('city', e.target.value)} 
            placeholder={t('form.cityPlaceholder')}
            className={errors.city ? "border-red-500" : ""}
          />
          {errors.city && <p className="text-xs text-red-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/>{errors.city}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="apartment">{t('form.apartmentVilla')} <span className="text-red-500">*</span></Label>
          <Input 
            id="apartment" 
            value={formData.apartment} 
            onChange={(e) => handleChange('apartment', e.target.value)} 
            placeholder={t('form.apartmentPlaceholder')}
            className={errors.apartment ? "border-red-500" : ""}
          />
          {errors.apartment && <p className="text-xs text-red-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/>{errors.apartment}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t('form.contactPhone')} <span className="text-red-500">*</span></Label>
          <Input 
            id="phone" 
            value={formData.phone} 
            onChange={(e) => handleChange('phone', e.target.value)} 
            placeholder={t('form.phonePlaceholder')}
            className={errors.phone ? "border-red-500" : ""}
          />
          {errors.phone && <p className="text-xs text-red-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/>{errors.phone}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">{t('form.addressLabel')}</Label>
          <Input 
            id="label" 
            value={formData.label} 
            onChange={(e) => handleChange('label', e.target.value)} 
            placeholder={t('form.labelPlaceholder')}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="fullName">{t('form.fullName')} <span className="text-red-500">*</span></Label>
          <Input 
            id="fullName" 
            value={formData.fullName} 
            onChange={(e) => handleChange('fullName', e.target.value)} 
            placeholder={t('form.fullNamePlaceholder')}
            className={errors.fullName ? "border-red-500" : ""}
          />
          {errors.fullName && <p className="text-xs text-red-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/>{errors.fullName}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="email">{t('form.email')}</Label>
          <Input 
            id="email" 
            type="email"
            value={formData.email} 
            onChange={(e) => handleChange('email', e.target.value)} 
            placeholder={t('form.emailPlaceholder')}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">{t('form.notesForCleaner')}</Label>
          <Input 
            id="notes" 
            value={formData.notes} 
            onChange={(e) => handleChange('notes', e.target.value)} 
            placeholder={t('form.notesPlaceholder')}
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
            {t('form.saveAddress')}
          </Label>
        </div>
      )}
    </div>
  );
};

export default ManualAddressForm;
