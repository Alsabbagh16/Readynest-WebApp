import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { JOB_ASSIGNEE_GROUPS, groupJobAssignees } from '@/lib/jobAssignees';
import { isEmployeeVisibleInJobAssignment } from '@/lib/localEmployeeDirectory';

export default function JobAssigneeGroups({ employees, selectedIds = [], onToggle }) {
  const selected = new Set(selectedIds);
  const groups = groupJobAssignees(employees.filter((employee) => (
    !onToggle || selected.has(employee.id) || isEmployeeVisibleInJobAssignment(employee)
  )));

  return (
    <div className="space-y-4">
      {JOB_ASSIGNEE_GROUPS.map(({ key, label, tint }) => {
        const members = groups[key];
        if (key === 'other' && !members.length) return null;
        return (
          <fieldset key={key} className="min-w-0 rounded-md border px-3 pb-3">
            <legend className="px-1 text-sm font-semibold">{label}</legend>
            {members.length ? (
              <ul className="mt-1 grid gap-2 sm:grid-cols-2">
                {members.map((employee) => {
                  const name = employee.full_name || employee.email || 'Employee';
                  return (
                    <li key={employee.id} className={`rounded-md px-2 py-1.5 text-sm ${tint}`}>
                      {onToggle ? (
                        <label className="flex cursor-pointer items-center gap-2">
                          <Checkbox checked={selected.has(employee.id)} onCheckedChange={() => onToggle(employee.id)} />
                          <span>{name}</span>
                        </label>
                      ) : name}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-1 text-sm text-muted-foreground">{onToggle ? 'None available' : 'None assigned'}</p>}
          </fieldset>
        );
      })}
    </div>
  );
}
