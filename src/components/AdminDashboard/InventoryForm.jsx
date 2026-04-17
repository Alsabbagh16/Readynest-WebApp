import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const SIZE_OPTIONS = ['Kg', 'g', 'Lt', 'Ml', 'Oz', 'Ctn', 'Box'];

const InventoryForm = ({ 
  type = 'item', 
  initialData = null, 
  categories = [],
  suppliers = [],
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) => {
  const isCategory = type === 'category';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    cost: '',
    supplier_id: '',
    quantity: '',
    size: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      if (isCategory) {
        setFormData({
          name: initialData.name || '',
          description: initialData.description || '',
          category_id: '',
          cost: '',
          supplier_id: '',
          quantity: '',
          size: ''
        });
      } else {
        setFormData({
          name: initialData.name || '',
          description: initialData.description || '',
          category_id: initialData.category_id?.toString() || '',
          cost: initialData.cost?.toString() || '',
          supplier_id: initialData.supplier_id?.toString() || '',
          quantity: initialData.quantity?.toString() || '',
          size: initialData.size || ''
        });
      }
    } else {
      setFormData({
        name: '',
        description: '',
        category_id: '',
        cost: '',
        supplier_id: '',
        quantity: '',
        size: ''
      });
    }
  }, [initialData, isCategory]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = `${isCategory ? 'Category' : 'Item'} name is required`;
    }

    if (!isCategory) {
      if (!formData.category_id) {
        newErrors.category_id = 'Category is required';
      }

      if (!formData.cost || parseFloat(formData.cost) < 0) {
        newErrors.cost = 'Cost must be 0 or greater';
      }

      if (!formData.quantity || parseInt(formData.quantity) < 0) {
        newErrors.quantity = 'Quantity must be 0 or greater';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    let submitData;
    if (isCategory) {
      submitData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null
      };
    } else {
      submitData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category_id: parseInt(formData.category_id),
        cost: parseFloat(formData.cost),
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
        quantity: parseInt(formData.quantity),
        size: formData.size || null
      };
    }

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">{isCategory ? 'Category' : 'Item'} Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder={isCategory ? 'e.g., Cleaning Supplies' : 'e.g., All-Purpose Cleaner'}
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

      {!isCategory && (
        <>
          <div>
            <Label htmlFor="category_id">Category *</Label>
            <Select 
              value={formData.category_id} 
              onValueChange={(value) => handleChange('category_id', value)} 
              disabled={isSubmitting}
            >
              <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cost">Cost (BD) *</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => handleChange('cost', e.target.value)}
                placeholder="0.00"
                className={errors.cost ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.cost && <p className="text-xs text-red-500 mt-1">{errors.cost}</p>}
            </div>

            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                placeholder="0"
                className={errors.quantity ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
            </div>

            <div>
              <Label htmlFor="size">Size</Label>
              <Select 
                value={formData.size} 
                onValueChange={(value) => handleChange('size', value)} 
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="supplier_id">Supplier</Label>
            <Select 
              value={formData.supplier_id} 
              onValueChange={(value) => handleChange('supplier_id', value)} 
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((sup) => (
                  <SelectItem key={sup.id} value={sup.id.toString()}>
                    {sup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialData ? `Update ${isCategory ? 'Category' : 'Item'}` : `Create ${isCategory ? 'Category' : 'Item'}`}
        </Button>
      </div>
    </form>
  );
};

export default InventoryForm;
