import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Terminal } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import EmployeeForm from '@/components/AdminDashboard/EmployeeForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { addEmployee, findEmployeeById, getEmployeeDepartments, updateEmployee } from '@/lib/storage/employeeStorage';

const AdminEmployeeFormPage = ({ mode = 'create' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = mode === 'edit';
  const [employee, setEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');

  const loadFormData = useCallback(async () => {
    setLoading(true);
    try {
      const [departmentRows, employeeRow] = await Promise.all([
        getEmployeeDepartments(),
        isEditing ? findEmployeeById(id) : Promise.resolve(null),
      ]);
      if (isEditing && !employeeRow) {
        toast({ title: 'Employee Not Found', description: 'The requested employee could not be found.', variant: 'destructive' });
        navigate('/admin-dashboard/employees', { replace: true });
        return;
      }
      setDepartments(departmentRows || []);
      setEmployee(employeeRow);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id, isEditing, navigate, toast]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  const handleSave = async (employeeData) => {
    setFormError('');
    try {
      const savedEmployee = isEditing ? await updateEmployee(employeeData) : await addEmployee(employeeData);
      toast({ title: isEditing ? 'Employee Updated' : 'Employee Added', description: `${savedEmployee.full_name || savedEmployee.email} was saved successfully.` });
      navigate(`/admin-dashboard/employee/${savedEmployee.id}`);
    } catch (error) {
      setFormError(error.message || 'An unexpected error occurred.');
      throw error;
    }
  };

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading employee form...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(isEditing ? `/admin-dashboard/employee/${id}` : '/admin-dashboard/employees')} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">{isEditing ? 'Edit Employee' : 'Create Employee'}</h1>
            <p className="mt-1 text-sm text-slate-500">{isEditing ? 'Update the employee profile, department, and assignment settings.' : 'Create a complete employee profile and place it in the correct team hierarchy.'}</p>
          </div>
        </div>

        {!isEditing && (
          <Alert className="border-blue-200 bg-blue-50 text-blue-700">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Supabase Auth ID required</AlertTitle>
            <AlertDescription>Create or invite the user in Supabase Authentication first, then enter the User UID below.</AlertDescription>
          </Alert>
        )}
        {formError && (
          <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>Save Error</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>
        )}

        <EmployeeForm
          departments={departments}
          employee={employee}
          onSave={handleSave}
          onCancel={() => navigate(isEditing ? `/admin-dashboard/employee/${id}` : '/admin-dashboard/employees')}
        />
      </div>
    </div>
  );
};

export default AdminEmployeeFormPage;
