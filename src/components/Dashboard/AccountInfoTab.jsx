import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, Phone } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const PersonalDetailsForm = ({ initialData, onSave, isEditing, authLoading, userProvider }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [userType, setUserType] = useState('');

  useEffect(() => {
    if (initialData.profile) {
      setFirstName(initialData.profile.first_name || '');
      setLastName(initialData.profile.last_name || '');
      setPhone(initialData.profile.phone || ''); 
      setDob(initialData.profile.dob || '');
      setUserType(initialData.profile.user_type || 'home_owner'); 
    }
    if (initialData.user) {
      setEmail(initialData.user.email || '');
    }
  }, [initialData]);

  const handleSave = () => {
    onSave({
      first_name: firstName,
      last_name: lastName,
      phone: phone, 
      dob,
      user_type: userType,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dash-firstName">First Name</Label>
          <Input id="dash-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!isEditing || authLoading} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dash-lastName">Last Name</Label>
          <Input id="dash-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!isEditing || authLoading} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dash-email">Email</Label>
          <div className="relative">
            <Input id="dash-email" type="email" value={email} disabled />
            {!initialData.user?.email_confirmed_at && (
              <Badge variant="warning" className="absolute right-2 top-1/2 -translate-y-1/2 bg-yellow-100 text-yellow-800">
                Unverified
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">Contact support to change your email.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dash-phone">Personal Contact Number</Label>
          <Input id="dash-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isEditing || authLoading} placeholder="Your primary mobile number" />
          <p className="text-xs text-muted-foreground">This number is used for account-related notifications.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dash-dob">Date of Birth</Label>
          <Input id="dash-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} disabled={!isEditing || authLoading} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dash-userType">Account Type</Label>
          <Select value={userType} onValueChange={setUserType} disabled={!isEditing || authLoading}>
            <SelectTrigger id="dash-userType">
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home_owner">Home Owner</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {isEditing && (
        <Button onClick={handleSave} disabled={authLoading}>{authLoading ? 'Saving...' : 'Save Personal Details'}</Button>
      )}
    </div>
  );
};

const PasswordChangeForm = ({ onSavePassword, isEditing, authLoading, userProvider }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isEditing) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  }, [isEditing]);

  const handlePasswordChange = () => {
    if (userProvider === 'email' && !currentPassword && newPassword) {
      toast({ title: "Error", description: "Please enter your current password to change it.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword) { 
        onSavePassword({ password: newPassword, current_password: currentPassword });
    } else {
        toast({ title: "Info", description: "No new password entered. Password not changed.", variant: "default" });
    }
  };

  if (!isEditing) return null;

  return (
    <div className="space-y-6">
      <Separator />
      <div>
        <h3 className="text-lg font-medium mb-2">Change Password</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {userProvider !== 'email' ? "Password changes for social logins are handled by the provider." : "Leave fields blank to keep your current password."}
        </p>
        {userProvider === 'email' && (
          <div className="space-y-4">
            <div className="relative space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={authLoading} />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)} tabIndex={-1}>
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="relative space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={authLoading} />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)} tabIndex={-1}>
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="relative space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input id="confirm-new-password" type={showConfirmPassword ? "text" : "password"} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} disabled={authLoading} />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={handlePasswordChange} disabled={authLoading || !newPassword}>{authLoading ? 'Saving...' : 'Save New Password'}</Button>
          </div>
        )}
      </div>
    </div>
  );
};


const AccountInfoTab = () => {
  const { profile, updateProfile, loading: authLoading, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [initialFormData, setInitialFormData] = useState({ profile: null, user: null });

  useEffect(() => {
    setInitialFormData({ profile, user });
  }, [profile, user]);

  const handleResetForm = useCallback(() => {
    setInitialFormData({ profile, user }); 
  }, [profile, user]);

  const handleSaveChanges = async (detailsData) => {
    try {
      await updateProfile(detailsData); 
      setIsEditing(false); 
    } catch (error) {
      // Error is handled by updateProfile
    }
  };
  
  const handleSavePassword = async (passwordData) => {
    try {
        await updateProfile(passwordData); 
    } catch (error) {
        // Error is handled by updateProfile
    }
  };


  if (authLoading && !profile && !user) return <div className="p-6 text-center">Loading user data...</div>;
  if (!profile && !user) return <div className="p-6 text-center">No user data found.</div>;

  return (
    <Card className="border-0 shadow-none rounded-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Account Information
          {!user?.email_confirmed_at && (
            <Badge variant="warning" className="bg-yellow-100 text-yellow-800">
              Email Not Verified
            </Badge>
          )}
        </CardTitle>
        <CardDescription>View and update your personal details and password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <PersonalDetailsForm
            initialData={initialFormData}
            onSave={handleSaveChanges} 
            isEditing={isEditing}
            authLoading={authLoading}
            userProvider={user?.app_metadata?.provider || 'email'}
          />
          <PasswordChangeForm
            onSavePassword={handleSavePassword} 
            isEditing={isEditing}
            authLoading={authLoading}
            userProvider={user?.app_metadata?.provider || 'email'}
          />
          <div className="flex justify-end space-x-2 pt-4">
            {isEditing ? (
              <Button type="button" variant="outline" onClick={() => { setIsEditing(false); handleResetForm(); }} disabled={authLoading}>Cancel</Button>
            ) : (
              <Button type="button" onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AccountInfoTab;