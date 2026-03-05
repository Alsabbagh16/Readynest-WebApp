import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from 'lucide-react';

const CouponForm = ({ initialData = null, onSubmit, onCancel, isSubmitting = false }) => {
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    max_uses: '',
    max_uses_per_user: '',
    min_booking_value: '0',
    valid_from: '',
    valid_until: '',
    is_active: true
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        type: initialData.type || 'percentage',
        value: initialData.value?.toString() || '',
        max_uses: initialData.max_uses?.toString() || '',
        max_uses_per_user: initialData.max_uses_per_user?.toString() || '',
        min_booking_value: initialData.min_booking_value?.toString() || '0',
        valid_from: initialData.valid_from ? new Date(initialData.valid_from).toISOString().slice(0, 16) : '',
        valid_until: initialData.valid_until ? new Date(initialData.valid_until).toISOString().slice(0, 16) : '',
        is_active: initialData.is_active ?? true
      });
    }
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Coupon code is required';
    }

    if (!formData.value || parseFloat(formData.value) <= 0) {
      newErrors.value = 'Value must be greater than 0';
    }

    if (formData.type === 'percentage' && parseFloat(formData.value) > 100) {
      newErrors.value = 'Percentage cannot exceed 100%';
    }

    if (formData.max_uses_per_user && !formData.max_uses) {
      newErrors.max_uses_per_user = 'Max uses must be set if per-user limit is set';
    }

    if (formData.max_uses_per_user && formData.max_uses && 
        parseInt(formData.max_uses_per_user) > parseInt(formData.max_uses)) {
      newErrors.max_uses_per_user = 'Per-user limit cannot exceed global limit';
    }

    if (formData.valid_from && formData.valid_until && 
        new Date(formData.valid_from) >= new Date(formData.valid_until)) {
      newErrors.valid_until = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare data for submission
    const submitData = {
      code: formData.code.trim().toUpperCase(),
      type: formData.type,
      value: parseFloat(formData.value),
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      max_uses_per_user: formData.max_uses_per_user ? parseInt(formData.max_uses_per_user) : null,
      min_booking_value: parseFloat(formData.min_booking_value) || 0,
      valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
      is_active: formData.is_active
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="code">Coupon Code *</Label>
        <Input
          id="code"
          value={formData.code}
          onChange={(e) => handleChange('code', e.target.value)}
          placeholder="SUMMER2024"
          className={errors.code ? 'border-red-500' : ''}
          disabled={isSubmitting}
        />
        {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Discount Type *</Label>
          <Select value={formData.type} onValueChange={(value) => handleChange('type', value)} disabled={isSubmitting}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed Amount (BD)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="value">
            {formData.type === 'percentage' ? 'Discount %' : 'Discount Amount (BD)'} *
          </Label>
          <Input
            id="value"
            type="number"
            step="0.01"
            value={formData.value}
            onChange={(e) => handleChange('value', e.target.value)}
            placeholder={formData.type === 'percentage' ? '10' : '5.00'}
            className={errors.value ? 'border-red-500' : ''}
            disabled={isSubmitting}
          />
          {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="min_booking_value">Minimum Booking Value (BD)</Label>
        <Input
          id="min_booking_value"
          type="number"
          step="0.01"
          value={formData.min_booking_value}
          onChange={(e) => handleChange('min_booking_value', e.target.value)}
          placeholder="0.00"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="max_uses">Max Total Uses</Label>
          <Input
            id="max_uses"
            type="number"
            value={formData.max_uses}
            onChange={(e) => handleChange('max_uses', e.target.value)}
            placeholder="Unlimited"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
        </div>

        <div>
          <Label htmlFor="max_uses_per_user">Max Uses Per User</Label>
          <Input
            id="max_uses_per_user"
            type="number"
            value={formData.max_uses_per_user}
            onChange={(e) => handleChange('max_uses_per_user', e.target.value)}
            placeholder="Unlimited"
            className={errors.max_uses_per_user ? 'border-red-500' : ''}
            disabled={isSubmitting}
          />
          {errors.max_uses_per_user && <p className="text-xs text-red-500 mt-1">{errors.max_uses_per_user}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="valid_from">Valid From</Label>
          <Input
            id="valid_from"
            type="datetime-local"
            value={formData.valid_from}
            onChange={(e) => handleChange('valid_from', e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="valid_until">Valid Until</Label>
          <Input
            id="valid_until"
            type="datetime-local"
            value={formData.valid_until}
            onChange={(e) => handleChange('valid_until', e.target.value)}
            className={errors.valid_until ? 'border-red-500' : ''}
            disabled={isSubmitting}
          />
          {errors.valid_until && <p className="text-xs text-red-500 mt-1">{errors.valid_until}</p>}
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => handleChange('is_active', checked)}
          disabled={isSubmitting}
        />
        <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialData ? 'Update Coupon' : 'Create Coupon'}
        </Button>
      </div>
    </form>
  );
};

export default CouponForm;