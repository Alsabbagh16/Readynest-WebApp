import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, Terminal } from 'lucide-react';
import { addPartTimerEmployee, deleteEmployee, getEmployeeDepartments, getEmployees } from '@/lib/storage/employeeStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import PermissionGate from '@/components/PermissionGate';
import { usePermissionContext } from '@/contexts/PermissionContext';
import EmployeeDirectoryCards from '@/components/AdminDashboard/EmployeeDirectoryCards';
import EmployeeDepartmentsManager from '@/components/AdminDashboard/EmployeeDepartmentsManager';
import { decorateEmployeesWithVisibility, getPartTimers, isPartTimer } from '@/lib/localEmployeeDirectory';

const EmployeesTab = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPerm, hasUiRoles, isSuperadmin } = usePermissionContext();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('employees');
  const [activeEmployeeView, setActiveEmployeeView] = useState('regular');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPartTimerDialogOpen, setIsPartTimerDialogOpen] = useState(false);
  const [partTimerName, setPartTimerName] = useState('');

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const [employeeRows, departmentRows] = await Promise.all([getEmployees(), getEmployeeDepartments()]);
      setEmployees(decorateEmployeesWithVisibility(employeeRows || []));
      setDepartments(departmentRows || []);
    } catch (error) {
      toast({ title: 'Error Fetching Employees', description: error.message, variant: 'destructive' });
      setEmployees([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!window.confirm(`Are you sure you want to delete employee ${employeeName}?`)) return;
    try {
      await deleteEmployee(employeeId);
      toast({ title: 'Employee Deleted', description: `${employeeName} removed.` });
      await fetchDirectory();
    } catch (error) {
      toast({ title: 'Error Deleting Employee', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreatePartTimer = async () => {
    try {
      await addPartTimerEmployee(partTimerName);
      setActiveEmployeeView('part-time');
      setPartTimerName('');
      setIsPartTimerDialogOpen(false);
      await fetchDirectory();
      toast({ title: 'Part Timer Added', description: 'The part timer can now be assigned from the job page.' });
    } catch (error) {
      toast({ title: 'Unable to Create Part Timer', description: error.message, variant: 'destructive' });
    }
  };

  const regularEmployees = useMemo(() => employees.filter((employee) => !isPartTimer(employee)), [employees]);
  const partTimeEmployees = useMemo(() => getPartTimers(employees), [employees]);
  const activeEmployees = activeEmployeeView === 'part-time' ? partTimeEmployees : regularEmployees;
  const canManageEmployees = isSuperadmin || !hasUiRoles || hasPerm('employees.create');
  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return activeEmployees;
    return activeEmployees.filter((employee) => [
      employee.full_name,
      employee.email,
      employee.mobile,
      employee.position,
      employee.department?.name,
      employee.employee_position?.name,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [activeEmployees, searchTerm]);

  if (loading) return <div className="p-8 text-center text-sm text-slate-500">Loading employee directory...</div>;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">Organize your team by department and position.</p>
        </div>
        {activeTab === 'employees' && (
          <PermissionGate permission="employees.create">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/admin-dashboard/employees/new')} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Employee</Button>
              <Button onClick={() => setIsPartTimerDialogOpen(true)} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Part Timer</Button>
            </div>
          </PermissionGate>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:w-[360px]">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'employees' ? (
        <>
          <Alert className="border-blue-200 bg-blue-50 text-blue-700">
            <Terminal className="h-4 w-4 stroke-blue-600" />
            <AlertTitle className="font-semibold text-blue-800">Employee access</AlertTitle>
            <AlertDescription className="text-sm">Create or invite the user in Supabase Authentication first, then use that User UID when adding their employee profile.</AlertDescription>
          </Alert>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex w-full rounded-md border bg-muted/30 p-1 md:w-auto">
              <Button type="button" variant={activeEmployeeView === 'regular' ? 'default' : 'ghost'} size="sm" className="flex-1 md:flex-none" onClick={() => setActiveEmployeeView('regular')}>Regular Employees ({regularEmployees.length})</Button>
              <Button type="button" variant={activeEmployeeView === 'part-time' ? 'default' : 'ghost'} size="sm" className="flex-1 md:flex-none" onClick={() => setActiveEmployeeView('part-time')}>Part-Time Employees ({partTimeEmployees.length})</Button>
            </div>
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search employees..." className="pl-9" />
            </div>
          </div>

          <EmployeeDirectoryCards
            canManage={canManageEmployees}
            departments={departments}
            employees={filteredEmployees}
            onDelete={handleDeleteEmployee}
            onEdit={(employee) => navigate(`/admin-dashboard/employee/${employee.id}/edit`)}
            emptyMessage={searchTerm.trim() ? 'No employees match your search.' : 'No employees found in this view.'}
          />
        </>
      ) : (
        <EmployeeDepartmentsManager departments={departments} onRefresh={fetchDirectory} />
      )}

      <Dialog open={isPartTimerDialogOpen} onOpenChange={setIsPartTimerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Part Timer</DialogTitle>
            <DialogDescription>Part timers are saved to the directory and can be assigned from the job page.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="part-timer-name">Name</Label>
            <Input id="part-timer-name" value={partTimerName} onChange={(event) => setPartTimerName(event.target.value)} placeholder="Enter part timer name" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPartTimerDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleCreatePartTimer} disabled={!partTimerName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesTab;
