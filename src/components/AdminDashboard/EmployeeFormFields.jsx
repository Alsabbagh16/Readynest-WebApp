import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EmployeeFormFields = ({ formData, handleChange, isEditingEmployee }) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isEditingEmployee && (
            <>
                <div>
                    <Label htmlFor="emp-id" className="flex gap-1">Employee ID (Auth UUID) <span className="text-red-500">*</span></Label>
                    <Input id="emp-id" name="id" value={formData.id} onChange={handleChange} required placeholder="UUID from Supabase Auth" />
                </div>
                <div>
                    <Label htmlFor="emp-email" className="flex gap-1">Email <span className="text-red-500">*</span></Label>
                    <Input id="emp-email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                </div>
            </>
        )}
        {isEditingEmployee && (
             <div>
                <Label htmlFor="emp-email-display" className="flex gap-1">Email <span className="text-red-500">*</span></Label>
                <Input id="emp-email-display" name="email" type="email" value={formData.email} readOnly disabled className="bg-gray-100" />
            </div>
        )}
        <div>
          <Label htmlFor="emp-fullName" className="flex gap-1">Full Name <span className="text-red-500">*</span></Label>
          <Input id="emp-fullName" name="fullName" value={formData.fullName} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="emp-mobile">Mobile</Label>
          <Input id="emp-mobile" name="mobile" type="tel" value={formData.mobile} onChange={handleChange} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="emp-address">Address</Label>
          <Input id="emp-address" name="address" value={formData.address} onChange={handleChange} />
        </div>
        <div>
          <Label htmlFor="emp-position">Position</Label>
          <Input id="emp-position" name="position" value={formData.position} onChange={handleChange} />
        </div>
        <div>
          <Label htmlFor="emp-role" className="flex gap-1">Role <span className="text-red-500">*</span></Label>
          <select 
            id="emp-role" 
            name="role" 
            value={formData.role} 
            onChange={handleChange}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="staff">Staff</option>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </div>
         <div>
          <Label htmlFor="emp-origin">Origin (Country)</Label>
          <Input id="emp-origin" name="origin" value={formData.origin} onChange={handleChange} />
        </div>
         <div>
          <Label htmlFor="emp-sex">Sex</Label>
          <Input id="emp-sex" name="sex" value={formData.sex} onChange={handleChange} />
        </div>
         <div>
          <Label htmlFor="emp-dateOfBirth">Date of Birth</Label>
          <Input id="emp-dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} />
        </div>
         <div>
          <Label htmlFor="emp-passportNumber">Passport Number</Label>
          <Input id="emp-passportNumber" name="passportNumber" value={formData.passportNumber} onChange={handleChange} />
        </div>
         <div>
          <Label htmlFor="emp-passportIssueDate">Passport Issue Date</Label>
          <Input id="emp-passportIssueDate" name="passportIssueDate" type="date" value={formData.passportIssueDate} onChange={handleChange} />
        </div>
         <div>
          <Label htmlFor="emp-passportExpiryDate">Passport Expiry Date</Label>
          <Input id="emp-passportExpiryDate" name="passportExpiryDate" type="date" value={formData.passportExpiryDate} onChange={handleChange} />
        </div>
         <div>
          <Label htmlFor="emp-hireDate">Hire Date</Label>
          <Input id="emp-hireDate" name="hireDate" type="date" value={formData.hireDate} onChange={handleChange} />
        </div>
        <div>
          <Label htmlFor="emp-visaNumber">Visa Number</Label>
          <Input id="emp-visaNumber" name="visaNumber" value={formData.visaNumber} onChange={handleChange} />
        </div>
         <div>
          <Label htmlFor="emp-visaIssuanceDate">Visa Issuance Date</Label>
          <Input id="emp-visaIssuanceDate" name="visaIssuanceDate" type="date" value={formData.visaIssuanceDate} onChange={handleChange} />
        </div>
         <div>
          <Label htmlFor="emp-visaExpiryDate">Visa Expiry Date</Label>
          <Input id="emp-visaExpiryDate" name="visaExpiryDate" type="date" value={formData.visaExpiryDate} onChange={handleChange} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="emp-photoUrl">Photo URL</Label>
          <Input id="emp-photoUrl" name="photoUrl" value={formData.photoUrl} onChange={handleChange} placeholder="https://example.com/image.png"/>
        </div>
      </div>
    </>
  );
};

export default EmployeeFormFields;