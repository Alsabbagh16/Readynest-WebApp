import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from 'lucide-react';

const EditUserForm = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '', // Added phone
    dob: '',
    user_type: 'Personal',
    credits: 0,
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '', // Set phone from user data
        dob: user.dob ? (user.dob instanceof Date ? user.dob.toISOString().split('T')[0] : user.dob.split('T')[0]) : '',
        user_type: user.user_type || 'Personal',
        credits: user.credits || 0,
        password: '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

   const handleSelectChange = (value) => {
    setFormData(prev => ({ ...prev, user_type: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email) {
        alert("First Name, Last Name, and Email are required.");
        return;
    }
    const creditsNum = parseInt(formData.credits, 10);
    if (isNaN(creditsNum) || creditsNum < 0) {
        alert("Credits must be a non-negative number.");
        return;
    }
    
    const dataToSave = { 
      id: formData.id,
      first_name: formData.first_name, 
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone, // Include phone in data to save
      dob: formData.dob,
      user_type: formData.user_type,
      credits: creditsNum,
    };

    if (formData.password) {
        dataToSave.password = formData.password;
    }

    onSave(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-first_name">First Name</Label>
            <Input id="edit-first_name" name="first_name" value={formData.first_name} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="edit-last_name">Last Name</Label>
            <Input id="edit-last_name" name="last_name" value={formData.last_name} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" name="email" type="email" value={formData.email} onChange={handleChange} required disabled={!!user} />
             {user && <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>}
          </div>
          <div>
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
          </div>
           <div>
            <Label htmlFor="edit-dob">Date of Birth</Label>
            <Input id="edit-dob" name="dob" type="date" value={formData.dob} onChange={handleChange} />
          </div>
           <div>
            <Label htmlFor="edit-user_type">User Type</Label>
             <Select name="user_type" value={formData.user_type} onValueChange={handleSelectChange}>
                <SelectTrigger id="edit-user_type">
                    <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Personal">Personal</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="home_owner">Home Owner</SelectItem>
                    <SelectItem value="property_manager">Property Manager</SelectItem>
                    <SelectItem value="vacation_rental_owner">Vacation Rental Owner</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                </SelectContent>
            </Select>
          </div>
           <div>
            <Label htmlFor="edit-credits">Credits</Label>
            <Input id="edit-credits" name="credits" type="number" min="0" value={formData.credits} onChange={handleChange} required />
          </div>
           <div className="relative md:col-span-2">
              <Label htmlFor="edit-password">Password</Label>
              <Input
                  id="edit-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current"
              />
              <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-6 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
              >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
              </Button>
            </div>
      </div>
      <DialogFooter className="pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Changes</Button>
      </DialogFooter>
    </form>
  );
};

export default EditUserForm;