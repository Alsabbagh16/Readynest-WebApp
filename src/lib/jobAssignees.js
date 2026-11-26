import { isPartTimer } from './localEmployeeDirectory.js';

export const JOB_ASSIGNEE_FIELDS =
  'id, full_name, email, role, position, is_part_timer, visible_in_job_assignment, department:employee_departments!employees_department_id_fkey(name)';

export const JOB_ASSIGNEE_GROUPS = [
  { key: 'cleaner', label: 'Cleaners', tint: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', pdfFill: [220, 252, 231], pdfText: [4, 120, 87] },
  { key: 'operations', label: 'Operations Employees', tint: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200', pdfFill: [237, 233, 254], pdfText: [91, 33, 182] },
  { key: 'partTime', label: 'Part-Timers', tint: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200', pdfFill: [255, 237, 213], pdfText: [154, 52, 18] },
  { key: 'other', label: 'Other Employees', tint: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200', pdfFill: [241, 245, 249], pdfText: [51, 65, 85] },
];

const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export function getJobAssigneeGroup(employee) {
  const department = normalize(employee.department?.name).replace(/ department$/, '');
  const position = normalize(employee.position);

  if (department === 'operation' || department === 'operations') return 'operations';
  if (isPartTimer(employee) || ['part timer', 'part-timer', 'part-time', 'part time', 'part-time cleaner', 'part time cleaner'].includes(position)) {
    return 'partTime';
  }
  if (['cleaning', 'cleaning crew'].includes(department) || ['cleaner', 'cleaners'].includes(position) || normalize(employee.role) === 'cleaner') {
    return 'cleaner';
  }
  return 'other';
}

export function groupJobAssignees(employees = []) {
  const groups = { cleaner: [], operations: [], partTime: [], other: [] };
  const seen = new Set();
  for (const employee of employees) {
    if (!employee?.id || seen.has(employee.id)) continue;
    seen.add(employee.id);
    groups[getJobAssigneeGroup(employee)].push(employee);
  }
  return groups;
}

export function getJobStaffingLabel(employees) {
  const { cleaner, partTime } = groupJobAssignees(employees);
  const cleanerLabel = cleaner.length === 0 ? 'No cleaners' : `${cleaner.length} cleaner${cleaner.length === 1 ? '' : 's'}`;
  if (!partTime.length) return cleanerLabel;
  return `${cleanerLabel} · ${partTime.length} part-timer${partTime.length === 1 ? '' : 's'}`;
}
