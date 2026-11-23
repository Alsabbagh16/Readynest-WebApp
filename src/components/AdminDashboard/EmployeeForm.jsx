import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import EmployeeFormFields from '@/components/AdminDashboard/EmployeeFormFields';
import { uploadEmployeePhoto } from '@/lib/storage/employeeStorage';

const INITIAL_FORM_DATA = {
  id: '', email: '', mobile: '', address: '', position: '', positionId: '', departmentId: '',
  fullName: '', origin: '', sex: '', passportNumber: '', passportIssueDate: '', passportExpiryDate: '',
  dateOfBirth: '', hireDate: '', visaNumber: '', visaIssuanceDate: '', visaExpiryDate: '', photoUrl: '',
  preferredOffDay: '', role: 'employee', visibleInJobAssignment: true,
};

const EmployeeForm = ({ departments = [], employee, onSave, onCancel }) => {
  const { toast } = useToast();
  const isEditingEmployee = Boolean(employee);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        id: employee.id || '',
        email: employee.email || '',
        mobile: employee.mobile || '',
        address: employee.address || '',
        position: employee.employee_position?.name || employee.position || '',
        positionId: employee.position_id || '',
        departmentId: employee.department_id || employee.employee_position?.department_id || '',
        fullName: employee.full_name || employee.fullName || '',
        origin: employee.origin || '',
        sex: employee.sex || '',
        passportNumber: employee.passport_number || employee.passportNumber || '',
        passportIssueDate: employee.passport_issue_date || employee.passportIssueDate || '',
        passportExpiryDate: employee.passport_expiry_date || employee.passportExpiryDate || '',
        dateOfBirth: employee.date_of_birth || employee.dateOfBirth || '',
        hireDate: employee.hire_date || employee.hireDate || '',
        visaNumber: employee.visa_number || employee.visaNumber || '',
        visaIssuanceDate: employee.visa_issuance_date || employee.visaIssuanceDate || '',
        visaExpiryDate: employee.visa_expiry_date || employee.visaExpiryDate || '',
        photoUrl: employee.photo_url || employee.photoUrl || '',
        preferredOffDay: employee.preferred_off_day || employee.preferredOffDay || '',
        role: employee.role || 'employee',
        visibleInJobAssignment: employee.visible_in_job_assignment !== false,
      });
      setPhotoPreview(employee.photo_url || '');
    } else {
      setFormData(INITIAL_FORM_DATA);
      setPhotoPreview('');
    }
    setPhotoFile(null);
  }, [employee]);

  useEffect(() => () => {
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const selectedDepartment = useMemo(
    () => departments.find((department) => department.id === formData.departmentId),
    [departments, formData.departmentId]
  );

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'departmentId' ? { positionId: '', position: '' } : {}),
    }));
  };

  const handlePhotoChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    if (!nextFile) return;
    if (!String(nextFile.type || '').startsWith('image/')) {
      toast({ title: 'Invalid Photo', description: 'Please choose an image file.', variant: 'destructive' });
      return;
    }
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(nextFile);
    setPhotoPreview(URL.createObjectURL(nextFile));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.fullName || !formData.email || !formData.role) {
      toast({ title: 'Validation Error', description: 'Full Name, Email, and Role are required.', variant: 'destructive' });
      return;
    }
    if (!isEditingEmployee && !formData.id) {
      toast({ title: 'Validation Error', description: 'Employee ID (Supabase Auth User ID) is required.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl = formData.photoUrl;
      if (photoFile) {
        const uploadedPhoto = await uploadEmployeePhoto(formData.id || employee.id, photoFile);
        photoUrl = uploadedPhoto.publicUrl;
      }

      const selectedPosition = selectedDepartment?.positions?.find((position) => position.id === formData.positionId);
      await onSave({
        ...formData,
        id: employee?.id || formData.id,
        photoUrl,
        position: selectedPosition?.name || '',
        visible_in_job_assignment: formData.visibleInJobAssignment,
      });
    } catch (error) {
      toast({ title: 'Unable to Save Employee', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <EmployeeFormFields
        departments={departments}
        formData={formData}
        handleChange={handleChange}
        handlePhotoChange={handlePhotoChange}
        isEditingEmployee={isEditingEmployee}
        photoPreview={photoPreview}
        positions={selectedDepartment?.positions || []}
      />
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Saving Employee...' : 'Save Employee'}</Button>
      </div>
    </form>
  );
};

export default EmployeeForm;
