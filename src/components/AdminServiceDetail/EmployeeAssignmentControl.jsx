import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"; // Assuming Checkbox component exists
import { X } from 'lucide-react';

const EmployeeAssignmentControl = ({ allEmployees, assignedEmployeeIds, onUpdateAssignments, disabled }) => {
  const [selectedIds, setSelectedIds] = useState(assignedEmployeeIds || []);
  const [showEmployeeList, setShowEmployeeList] = useState(false);

  useEffect(() => {
    setSelectedIds(assignedEmployeeIds || []);
  }, [assignedEmployeeIds]);

  const handleCheckboxChange = (employeeId) => {
    setSelectedIds(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleRemoveEmployee = (employeeId) => {
      const newSelectedIds = selectedIds.filter(id => id !== employeeId);
      setSelectedIds(newSelectedIds);
      onUpdateAssignments(newSelectedIds); // Update immediately on removal
  };

  const handleSaveChanges = () => {
      // Check if arrays are different before saving
      const sortedCurrent = [...assignedEmployeeIds].sort();
      const sortedNew = [...selectedIds].sort();
      if (JSON.stringify(sortedCurrent) !== JSON.stringify(sortedNew)) {
          onUpdateAssignments(selectedIds);
      }
      setShowEmployeeList(false);
  };

  const getEmployeeName = (employeeId) => {
    const employee = allEmployees.find(emp => emp.id === employeeId);
    return employee ? (employee.fullName || employee.email) : 'Unknown Employee';
  };

  return (
    <div className="space-y-2">
        <Label>Assigned Employees</Label>
        <div className="space-y-2">
            {selectedIds.length > 0 ? (
                selectedIds.map(id => (
                    <div key={id} className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                        <span className="text-sm">{getEmployeeName(id)}</span>
                        {!disabled && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-500 hover:bg-red-100"
                                onClick={() => handleRemoveEmployee(id)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))
            ) : (
                <p className="text-sm text-gray-500">No employees assigned.</p>
            )}
        </div>

        {!disabled && (
            <div className="pt-2">
                {!showEmployeeList ? (
                    <Button variant="outline" size="sm" onClick={() => setShowEmployeeList(true)}>
                        Add/Change Employees
                    </Button>
                ) : (
                    <div className="p-3 border rounded-md mt-2 space-y-3 bg-white">
                        <p className="text-sm font-medium">Select employees to assign:</p>
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                            {allEmployees.map(emp => (
                                <div key={emp.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`emp-${emp.id}`}
                                        checked={selectedIds.includes(emp.id)}
                                        onCheckedChange={() => handleCheckboxChange(emp.id)}
                                    />
                                    <Label htmlFor={`emp-${emp.id}`} className="text-sm font-normal cursor-pointer">
                                        {emp.fullName || emp.email} ({emp.position})
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                             <Button variant="ghost" size="sm" onClick={() => { setShowEmployeeList(false); setSelectedIds(assignedEmployeeIds); }}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveChanges}>
                                Save Assignments
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default EmployeeAssignmentControl;