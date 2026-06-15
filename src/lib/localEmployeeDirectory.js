export const isEmployeeVisibleInJobAssignment = (employee) => (
  employee?.visible_in_job_assignment !== false &&
  employee?.visibleInJobAssignment !== false
);

export const isPartTimer = (employee) => (
  employee?.is_part_timer === true ||
  employee?.isPartTimer === true ||
  employee?.position === 'Part Timer'
);

export const decorateEmployeeDirectoryEntry = (employee) => ({
  ...employee,
  isPartTimer: isPartTimer(employee),
  visibleInJobAssignment: isEmployeeVisibleInJobAssignment(employee),
});

export const decorateEmployeesWithVisibility = (employees = []) =>
  employees.map(decorateEmployeeDirectoryEntry);

export const getPartTimers = (employees = []) =>
  decorateEmployeesWithVisibility(employees).filter(isPartTimer);

export const getAllAssigneeDirectory = (employees = []) => [
  ...decorateEmployeesWithVisibility(employees),
];

export const getVisibleAssigneeOptions = (employees = []) => {
  const visibleEmployees = decorateEmployeesWithVisibility(employees)
    .filter((employee) => employee.visibleInJobAssignment !== false);

  return visibleEmployees;
};

export const mapAssignedEmployeeDetails = (assignedIds = [], employees = []) => {
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));

  return assignedIds
    .map((employeeId) => employeesById.get(employeeId))
    .filter(Boolean);
};
