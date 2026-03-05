import React from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, User, Briefcase, CalendarDays, Phone } from 'lucide-react';
import { format } from 'date-fns';

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start space-x-3">
    <div className="flex-shrink-0 text-primary">{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-sm text-gray-800">{value || 'N/A'}</p>
    </div>
  </div>
);

const AdminMyAccountTab = () => {
  const { adminProfile, adminUser } = useAdminAuth();

  if (!adminProfile || !adminUser) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>My Account</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading account details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return 'AD';
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
  };
  
  const formatDateSafe = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="overflow-hidden shadow-lg border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/80 to-primary/60 text-primary-foreground p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 border-2 border-white">
              <AvatarImage src={adminProfile.photo_url || undefined} alt={adminProfile.full_name || 'Admin'} />
              <AvatarFallback className="text-xl bg-primary-foreground text-primary">{getInitials(adminProfile.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold">{adminProfile.full_name || 'Admin User'}</CardTitle>
              <CardDescription className="text-primary-foreground/80">{adminProfile.position || 'Administrator'}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <InfoRow icon={<Mail size={18} />} label="Email Address" value={adminUser.email} />
          <InfoRow icon={<User size={18} />} label="Full Name" value={adminProfile.full_name} />
          <InfoRow icon={<Briefcase size={18} />} label="Role" value={
            <Badge variant={adminProfile.role === 'superadmin' ? 'destructive' : (adminProfile.role === 'admin' ? 'default' : 'secondary')} className="capitalize">
              {adminProfile.role}
            </Badge>
          } />
          <InfoRow icon={<Briefcase size={18} />} label="Position" value={adminProfile.position} />
          <InfoRow icon={<Phone size={18} />} label="Mobile" value={adminProfile.mobile} />
          <InfoRow icon={<CalendarDays size={18} />} label="Date of Birth" value={formatDateSafe(adminProfile.date_of_birth)} />
          <InfoRow icon={<CalendarDays size={18} />} label="Hire Date" value={formatDateSafe(adminProfile.hire_date)} />
          <div className="md:col-span-2">
             <InfoRow icon={<User size={18} />} label="Employee ID (Supabase User ID)" value={adminProfile.id} />
          </div>
          
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <InfoRow icon={<User size={18} />} label="Origin Country" value={adminProfile.origin} />
            <InfoRow icon={<User size={18} />} label="Sex" value={adminProfile.sex} />
            <InfoRow icon={<User size={18} />} label="Passport Number" value={adminProfile.passport_number} />
            <InfoRow icon={<CalendarDays size={18} />} label="Passport Issue Date" value={formatDateSafe(adminProfile.passport_issue_date)} />
            <InfoRow icon={<CalendarDays size={18} />} label="Passport Expiry Date" value={formatDateSafe(adminProfile.passport_expiry_date)} />
            <InfoRow icon={<CalendarDays size={18} />} label="Visa Issuance Date" value={formatDateSafe(adminProfile.visa_issuance_date)} />
            <InfoRow icon={<CalendarDays size={18} />} label="Visa Expiry Date" value={formatDateSafe(adminProfile.visa_expiry_date)} />
             <div className="md:col-span-2">
                <InfoRow icon={<User size={18} />} label="Address" value={adminProfile.address} />
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMyAccountTab;