import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getEmployees, addEmployee, addPartTimerEmployee, updateEmployee, updateEmployeeJobVisibility, deleteEmployee } from '@/lib/storage/employeeStorage';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, Search, Terminal } from 'lucide-react';
import EmployeeTable from '@/components/AdminDashboard/EmployeeTable';
import EmployeeDialog from '@/components/AdminDashboard/EmployeeDialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PermissionGate from '@/components/PermissionGate';
import { decorateEmployeesWithVisibility, getPartTimers, isPartTimer } from '@/lib/localEmployeeDirectory';

const EmployeesTab = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPartTimerDialogOpen, setIsPartTimerDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formError, setFormError] = useState(null);
  const [partTimerName, setPartTimerName] = useState('');
  const [activeEmployeeView, setActiveEmployeeView] = useState('regular');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchEmployeesCallback = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      const decoratedEmployees = decorateEmployeesWithVisibility(data || []);
      setEmployees(decoratedEmployees);
    } catch (error) {
      toast({ title: "Error Fetching Employees", description: error.message, variant: "destructive" });
      setEmployees([]); 
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEmployeesCallback();
  }, [fetchEmployeesCallback]);

  const handleSaveEmployee = async (employeeData) => {
    setFormError(null); 
    try {
      if (editingEmployee) {
        await updateEmployee(employeeData);
        toast({ title: "Employee Updated", description: `Details for ${employeeData.fullName || employeeData.email} saved.` });
      } else {
        await addEmployee(employeeData);
        toast({ title: "Employee Added", description: `${employeeData.fullName || employeeData.email} added. Ensure they have a Supabase Auth account.` });
      }
      setIsDialogOpen(false);
      setEditingEmployee(null);
      fetchEmployeesCallback(); 
    } catch (error) {
      let errorMessage = error.message || "An unexpected error occurred.";
      if (error.message && error.message.includes("User already registered")) {
        errorMessage = "This email is already registered as a Supabase user.";
      } else if (error.message && error.message.includes("already exists")) {
        errorMessage = error.message; 
      }
      toast({ title: "Error Saving Employee", description: errorMessage, variant: "destructive" });
      setFormError(errorMessage);
    }
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
     if (window.confirm(`Are you sure you want to delete employee ${employeeName}?`)) {
        try {
            await deleteEmployee(employeeId);
            toast({ title: "Employee Deleted", description: `${employeeName} removed.` });
            fetchEmployeesCallback(); 
        } catch (error) {
            toast({ title: "Error Deleting Employee", description: error.message, variant: "destructive" });
        }
     }
  };

  const openEditDialog = (employee) => {
    setEditingEmployee(employee);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingEmployee(null);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleToggleVisibility = async (employee, visible) => {
    try {
      const updatedEmployee = await updateEmployeeJobVisibility(employee.id, visible);
      setEmployees((currentEmployees) =>
        currentEmployees.map((currentEmployee) =>
          currentEmployee.id === employee.id
            ? { ...currentEmployee, ...updatedEmployee, visibleInJobAssignment: visible }
            : currentEmployee
        )
      );

      toast({
        title: "Visibility Updated",
        description: `${employee.full_name || employee.email} is now ${visible ? 'visible' : 'hidden'} in job assignment.`,
      });
    } catch (error) {
      toast({ title: "Error Updating Visibility", description: error.message, variant: "destructive" });
    }
  };

  const handleCreatePartTimer = async () => {
    try {
      const newPartTimer = await addPartTimerEmployee(partTimerName);
      const decoratedPartTimer = decorateEmployeesWithVisibility([newPartTimer])[0];
      setEmployees((currentEmployees) => [decoratedPartTimer, ...currentEmployees]);
      setActiveEmployeeView('part-time');
      setPartTimerName('');
      setIsPartTimerDialogOpen(false);
      toast({
        title: "Part Timer Added",
        description: `${newPartTimer.full_name} can now be assigned from the job page.`,
      });
    } catch (error) {
      toast({ title: "Unable to Create Part Timer", description: error.message, variant: "destructive" });
    }
  };

  const regularEmployees = useMemo(
    () => employees.filter((employee) => !isPartTimer(employee)),
    [employees]
  );

  const partTimeEmployees = useMemo(
    () => getPartTimers(employees),
    [employees]
  );

  const activeEmployees = activeEmployeeView === 'part-time' ? partTimeEmployees : regularEmployees;

  const filteredEmployees = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    if (!normalizedSearchTerm) return activeEmployees;

    return activeEmployees.filter((employee) => [
      employee.full_name,
      employee.email,
      employee.mobile,
      employee.position,
      employee.role,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearchTerm)));
  }, [activeEmployees, searchTerm]);
  
  const handleDialogChange = (open) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingEmployee(null);
      setFormError(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading employees...</div>;
  }

  return (
    <div className="p-6">
       <PermissionGate permission="employees.create">
         <div className="flex justify-end gap-2 mb-4">
              <Button onClick={openNewDialog} size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
              </Button>
              <Button onClick={() => setIsPartTimerDialogOpen(true)} size="sm" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Part Timer
              </Button>
         </div>
       </PermissionGate>
       
        <Alert className="mb-4 bg-blue-50 border-blue-300 text-blue-700">
            <Terminal className="h-4 w-4 stroke-blue-600" />
            <AlertTitle className="font-semibold text-blue-800">Important Notes:</AlertTitle>
            <AlertDescription className="text-sm">
                <ul className="list-disc list-outside pl-5 space-y-1">
                    <li>This system now uses existing Supabase Auth IDs.</li>
                    <li>Create the user in Supabase Authentication first (or invite them), then copy their User UID here.</li>
                </ul>
            </AlertDescription>
        </Alert>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex w-full rounded-md border bg-muted/30 p-1 md:w-auto">
            <Button
              type="button"
              variant={activeEmployeeView === 'regular' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 md:flex-none"
              onClick={() => setActiveEmployeeView('regular')}
            >
              Regular Employees ({regularEmployees.length})
            </Button>
            <Button
              type="button"
              variant={activeEmployeeView === 'part-time' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 md:flex-none"
              onClick={() => setActiveEmployeeView('part-time')}
            >
              Part-Time Employees ({partTimeEmployees.length})
            </Button>
          </div>
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={`Search ${activeEmployeeView === 'part-time' ? 'part-time' : 'regular'} employees...`}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <div className="flex flex-col gap-1 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold">
                {activeEmployeeView === 'part-time' ? 'Part-Time Employees' : 'Regular Employees'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Showing {filteredEmployees.length} of {activeEmployees.length} employees
              </p>
            </div>
            {activeEmployeeView === 'part-time' && (
              <PermissionGate permission="employees.create">
                <Button onClick={() => setIsPartTimerDialogOpen(true)} size="sm" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Part Timer
                </Button>
              </PermissionGate>
            )}
          </div>
          <EmployeeTable
            employees={filteredEmployees}
            onEdit={openEditDialog}
            onDelete={handleDeleteEmployee}
            onToggleVisibility={handleToggleVisibility}
            canManage={true}
            emptyMessage={
              searchTerm.trim()
                ? "No employees match your search."
                : activeEmployeeView === 'part-time'
                  ? "No part-time employees found."
                  : "No regular employees found."
            }
          />
        </div>
      </div>
      {isDialogOpen && (
        <EmployeeDialog
            isOpen={isDialogOpen}
            onOpenChange={handleDialogChange}
            editingEmployee={editingEmployee}
            onSave={handleSaveEmployee}
            formError={formError}
            setFormError={setFormError}
        />
      )}
      <Dialog open={isPartTimerDialogOpen} onOpenChange={setIsPartTimerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Part Timer</DialogTitle>
            <DialogDescription>
              Part timers are saved to the employee directory and can be assigned from the job page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="part-timer-name">Name</Label>
            <Input
              id="part-timer-name"
              value={partTimerName}
              onChange={(event) => setPartTimerName(event.target.value)}
              placeholder="Enter part timer name"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPartTimerDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreatePartTimer}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesTab;
