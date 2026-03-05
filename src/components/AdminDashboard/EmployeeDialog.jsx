import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import EmployeeForm from '@/components/AdminDashboard/EmployeeForm';

const EmployeeDialog = ({ isOpen, onOpenChange, editingEmployee, onSave, formError, setFormError }) => {
  
  const handleDialogClose = () => {
    onOpenChange(false);
  };
  
  useEffect(() => {
    if (!isOpen) {
      setFormError(null); 
    }
  }, [isOpen, setFormError]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          <DialogDescription>
            {editingEmployee ? 'Update the details for this employee.' : 'Enter the details for the new employee. You must provide an existing Supabase Auth User ID.'}
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Save Error</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <EmployeeForm
          employee={editingEmployee}
          onSave={onSave}
          onCancel={handleDialogClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDialog;