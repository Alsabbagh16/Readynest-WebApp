import React from 'react';
import { ImagePlus, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const selectClassName = 'flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70';

const EmployeeFormFields = ({ departments, formData, handleChange, handlePhotoChange, isEditingEmployee, photoPreview, positions }) => (
  <div className="space-y-7">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-950">Profile photo</h2>
      <p className="mt-1 text-sm text-slate-500">Upload a clear employee photo. JPG, PNG, or WebP up to 8 MB.</p>
      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
          {photoPreview ? <img src={photoPreview} alt="Employee preview" className="h-full w-full object-cover" /> : <User className="h-12 w-12 text-slate-300" strokeWidth={1.4} />}
        </div>
        <div>
          <Label htmlFor="emp-photo" className="inline-flex cursor-pointer items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <ImagePlus className="mr-2 h-4 w-4" /> Choose Photo
          </Label>
          <Input id="emp-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} className="hidden" />
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-slate-950">Employee information</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <Label htmlFor="emp-email-display">Email</Label>
            <Input id="emp-email-display" name="email" type="email" value={formData.email} readOnly disabled className="bg-slate-100" />
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
          <Label htmlFor="emp-department">Department</Label>
          <select id="emp-department" name="departmentId" value={formData.departmentId} onChange={handleChange} className={selectClassName}>
            <option value="">No department</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="emp-position">Position</Label>
          <select id="emp-position" name="positionId" value={formData.positionId} onChange={handleChange} className={selectClassName} disabled={!formData.departmentId}>
            <option value="">{formData.departmentId ? 'No position' : 'Select a department first'}</option>
            {positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="emp-role" className="flex gap-1">Role <span className="text-red-500">*</span></Label>
          <select id="emp-role" name="role" value={formData.role} onChange={handleChange} className={selectClassName} required>
            <option value="staff">Staff</option><option value="employee">Employee</option><option value="admin">Admin</option><option value="superadmin">Superadmin</option>
          </select>
        </div>
        <div>
          <Label htmlFor="emp-preferredOffDay">Preferred Off Day</Label>
          <select id="emp-preferredOffDay" name="preferredOffDay" value={formData.preferredOffDay} onChange={handleChange} className={selectClassName}>
            <option value="">No preference</option>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 md:col-span-2">
          <div><Label htmlFor="emp-visible-job-assign" className="font-semibold">Show On Job Assign</Label><p className="text-sm text-slate-500">Include this employee in job assignment selectors.</p></div>
          <Switch id="emp-visible-job-assign" name="visibleInJobAssignment" checked={formData.visibleInJobAssignment} onCheckedChange={(checked) => handleChange({ target: { name: 'visibleInJobAssignment', type: 'checkbox', checked } })} />
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-slate-950">Personal and employment details</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><Label htmlFor="emp-origin">Origin (Country)</Label><Input id="emp-origin" name="origin" value={formData.origin} onChange={handleChange} /></div>
        <div><Label htmlFor="emp-sex">Sex</Label><Input id="emp-sex" name="sex" value={formData.sex} onChange={handleChange} /></div>
        <div><Label htmlFor="emp-dateOfBirth">Date of Birth</Label><Input id="emp-dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} /></div>
        <div><Label htmlFor="emp-hireDate">Hire Date</Label><Input id="emp-hireDate" name="hireDate" type="date" value={formData.hireDate} onChange={handleChange} /></div>
        <div><Label htmlFor="emp-passportNumber">Passport Number</Label><Input id="emp-passportNumber" name="passportNumber" value={formData.passportNumber} onChange={handleChange} /></div>
        <div><Label htmlFor="emp-passportIssueDate">Passport Issue Date</Label><Input id="emp-passportIssueDate" name="passportIssueDate" type="date" value={formData.passportIssueDate} onChange={handleChange} /></div>
        <div><Label htmlFor="emp-passportExpiryDate">Passport Expiry Date</Label><Input id="emp-passportExpiryDate" name="passportExpiryDate" type="date" value={formData.passportExpiryDate} onChange={handleChange} /></div>
        <div><Label htmlFor="emp-visaNumber">Visa Number</Label><Input id="emp-visaNumber" name="visaNumber" value={formData.visaNumber} onChange={handleChange} /></div>
        <div><Label htmlFor="emp-visaIssuanceDate">Visa Issuance Date</Label><Input id="emp-visaIssuanceDate" name="visaIssuanceDate" type="date" value={formData.visaIssuanceDate} onChange={handleChange} /></div>
        <div><Label htmlFor="emp-visaExpiryDate">Visa Expiry Date</Label><Input id="emp-visaExpiryDate" name="visaExpiryDate" type="date" value={formData.visaExpiryDate} onChange={handleChange} /></div>
      </div>
    </section>
  </div>
);

export default EmployeeFormFields;
