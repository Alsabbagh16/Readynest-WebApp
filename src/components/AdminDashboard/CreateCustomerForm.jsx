import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { UserPlus, Mail, Phone, User, CreditCard, Lock } from 'lucide-react';
import { createUser } from '@/lib/storage/userStorage';
import { supabase } from '@/lib/supabase';

const CreateCustomerForm = ({ onSuccess, onCancel }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    user_type: 'Personal',
    credits: 0
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUserTypeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      user_type: value
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.first_name.trim()) errors.push('First name is required');
    if (!formData.last_name.trim()) errors.push('Last name is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (!formData.password) errors.push('Password is required');
    if (formData.password.length < 6) errors.push('Password must be at least 6 characters');
    if (formData.password !== formData.confirmPassword) errors.push('Passwords do not match');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) errors.push('Please enter a valid email address');

    if (formData.phone && formData.phone.replace(/\D/g, '').length < 8) errors.push('Phone number must be at least 8 digits');

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const customerData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        user_type: formData.user_type,
        credits: parseInt(formData.credits) || 0
      };

      const newCustomer = await createUser(customerData);
      
      toast({
        title: "Customer Created Successfully",
        description: `${newCustomer.first_name} ${newCustomer.last_name} has been registered and can now login.`,
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: "Error Creating Customer",
        description: error.message || "Failed to create customer account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      user_type: 'Personal',
      credits: 0
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="first_name"
              name="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleInputChange}
              placeholder="Enter first name"
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name" className="text-sm font-medium">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="last_name"
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleInputChange}
              placeholder="Enter last name"
              required
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="customer@example.com"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone Number
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+1234567890"
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Min 6 characters"
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm password"
              required
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="user_type" className="text-sm font-medium">
              User Type
            </Label>
            <Select value={formData.user_type} onValueChange={handleUserTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select user type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Personal">Personal</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="credits" className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Initial Credits
            </Label>
            <Input
              id="credits"
              name="credits"
              type="number"
              min="0"
              value={formData.credits}
              onChange={handleInputChange}
              placeholder="0"
              className="w-full"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSubmitting}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Create Customer
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateCustomerForm;
