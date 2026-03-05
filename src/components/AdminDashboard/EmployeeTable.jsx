import React from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from 'lucide-react';

const EmployeeTable = ({ employees, onEdit, onDelete, canManage }) => {
  if (!employees || employees.length === 0) {
    return <p className="p-6 text-center">No employees found. This might be due to RLS policies or no employees have been added yet.</p>;
  }

  return (
    <div className="overflow-x-auto border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Role</TableHead>
            {canManage && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => (
            <TableRow key={emp.id}>
              <TableCell>
                 <Link to={`/admin-dashboard/employee/${emp.id}`} className="text-blue-600 hover:underline">
                    {emp.full_name || emp.email}
                 </Link>
              </TableCell>
              <TableCell>{emp.email}</TableCell>
              <TableCell>{emp.mobile}</TableCell>
              <TableCell>{emp.position}</TableCell>
              <TableCell>{emp.role}</TableCell>
              {canManage && (
                <TableCell className="space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(emp)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                    </Button>
                    <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-100" 
                    onClick={() => onDelete(emp.id, emp.full_name || emp.email)}
                    >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                    </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default EmployeeTable;