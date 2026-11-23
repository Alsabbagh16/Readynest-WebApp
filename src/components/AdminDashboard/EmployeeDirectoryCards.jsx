import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Phone, Trash2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const EmployeeCard = ({ canManage, employee, onDelete, onEdit }) => (
  <article className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
    <Link
      to={`/admin-dashboard/employee/${employee.id}`}
      className={`flex min-w-0 items-center gap-4 ${canManage ? 'pr-16' : ''}`}
      aria-label={`View ${employee.full_name || employee.email}`}
    >
      <Avatar className="h-14 w-14 shrink-0 border border-slate-200 bg-slate-50">
        <AvatarImage src={employee.photo_url || undefined} alt={employee.full_name || 'Employee'} />
        <AvatarFallback className="bg-slate-50 text-slate-400">
          <User className="h-7 w-7" strokeWidth={1.5} />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <h4 className="truncate text-base font-semibold text-slate-950 group-hover:text-blue-700">
          {employee.full_name || employee.email || 'Unnamed employee'}
        </h4>
        <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          {employee.mobile || 'No phone number'}
        </p>
      </div>
    </Link>
    {canManage && <div className="absolute right-3 top-3 flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:bg-blue-50 hover:text-blue-700"
        onClick={() => onEdit(employee)}
        aria-label={`Edit ${employee.full_name || employee.email}`}
      >
        <Edit3 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
        onClick={() => onDelete(employee.id, employee.full_name || employee.email)}
        aria-label={`Delete ${employee.full_name || employee.email}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>}
  </article>
);

const EmployeeDirectoryCards = ({ canManage = false, departments, employees, emptyMessage, onDelete, onEdit }) => {
  const directoryGroups = useMemo(() => {
    const assignedEmployeeIds = new Set();
    const groups = (departments || []).map((department) => {
      const positions = (department.positions || []).map((position) => {
        const positionEmployees = employees.filter((employee) => employee.position_id === position.id);
        positionEmployees.forEach((employee) => assignedEmployeeIds.add(employee.id));
        return { ...position, employees: positionEmployees };
      });

      const withoutPosition = employees.filter((employee) => (
        employee.department_id === department.id && !employee.position_id
      ));
      withoutPosition.forEach((employee) => assignedEmployeeIds.add(employee.id));

      return { ...department, positions, withoutPosition };
    });

    return {
      groups,
      uncategorized: employees.filter((employee) => !assignedEmployeeIds.has(employee.id)),
    };
  }, [departments, employees]);

  if (!employees?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
        {emptyMessage || 'No employees found.'}
      </div>
    );
  }

  const renderCards = (items) => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((employee) => (
        <EmployeeCard key={employee.id} canManage={canManage} employee={employee} onDelete={onDelete} onEdit={onEdit} />
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {directoryGroups.groups.map((department) => {
        const departmentCount = department.positions.reduce((total, position) => total + position.employees.length, 0)
          + department.withoutPosition.length;
        if (!departmentCount) return null;

        return (
          <section key={department.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-950">{department.name}</h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {departmentCount} employee{departmentCount === 1 ? '' : 's'}
              </span>
            </div>
            <div className="space-y-6">
              {department.positions.map((position) => position.employees.length > 0 && (
                <div key={position.id} className="border-l-2 border-blue-200 pl-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">{position.name}</h3>
                  {renderCards(position.employees)}
                </div>
              ))}
              {department.withoutPosition.length > 0 && (
                <div className="border-l-2 border-slate-200 pl-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">No position</h3>
                  {renderCards(department.withoutPosition)}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {directoryGroups.uncategorized.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
          <h2 className="mb-4 border-b border-slate-200 pb-3 text-lg font-bold text-slate-950">Unassigned</h2>
          {renderCards(directoryGroups.uncategorized)}
        </section>
      )}
    </div>
  );
};

export default EmployeeDirectoryCards;
