import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const SupplierForm = ({ 
  initialData = null, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mobile: '',
    salesman: '',
    email: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        mobile: initialData.mobile || '',
        salesman: initialData.salesman || '',
        email: initialData.email || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        mobile: '',
        salesman: '',
        email: ''
      });
    }
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      mobile: formData.mobile.trim() || null,
      salesman: formData.salesman.trim() || null,
      email: formData.email.trim() || null
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Supplier Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., ABC Supplies Co."
          className={errors.name ? 'border-red-500' : ''}
          disabled={isSubmitting}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Optional description..."
          rows={2}
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="mobile">Mobile</Label>
          <Input
            id="mobile"
            value={formData.mobile}
            onChange={(e) => handleChange('mobile', e.target.value)}
            placeholder="e.g., +973 1234 5678"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="salesman">Salesman</Label>
          <Input
            id="salesman"
            value={formData.salesman}
            onChange={(e) => handleChange('salesman', e.target.value)}
            placeholder="Contact person name"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="supplier@example.com"
          className={errors.email ? 'border-red-500' : ''}
          disabled={isSubmitting}
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialData ? 'Update Supplier' : 'Create Supplier'}
        </Button>
      </div>
    </form>
  );
};

export default SupplierForm;
