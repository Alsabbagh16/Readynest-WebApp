const PART_TIMERS_STORAGE_KEY = 'readynest_part_timers';
const EMPLOYEE_VISIBILITY_STORAGE_KEY = 'readynest_employee_job_visibility';

const parseStoredJson = (value, fallback) => {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse local employee directory data:', error);
    return fallback;
  }
};

const getSafeLocalStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const createUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `part-timer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getPartTimers = () => {
  const storage = getSafeLocalStorage();
  const storedPartTimers = parseStoredJson(storage?.getItem(PART_TIMERS_STORAGE_KEY), []);

  return storedPartTimers.map((employee) => ({
    ...employee,
    isPartTimer: true,
    position: employee.position || 'Part Timer',
    visibleInJobAssignment: employee.visibleInJobAssignment !== false,
  }));
};

export const createPartTimer = (name) => {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw new Error('Part timer name is required.');
  }

  const storage = getSafeLocalStorage();
  const currentPartTimers = getPartTimers();

  const newPartTimer = {
    id: createUuid(),
    full_name: trimmedName,
    position: 'Part Timer',
    isPartTimer: true,
    visibleInJobAssignment: true,
    created_at: new Date().toISOString(),
  };

  storage?.setItem(
    PART_TIMERS_STORAGE_KEY,
    JSON.stringify([newPartTimer, ...currentPartTimers])
  );

  return newPartTimer;
};

export const getEmployeeVisibilityMap = () => {
  const storage = getSafeLocalStorage();
  return parseStoredJson(storage?.getItem(EMPLOYEE_VISIBILITY_STORAGE_KEY), {});
};

export const setEmployeeVisibility = (employeeId, visible) => {
  if (!employeeId) return;

  const storage = getSafeLocalStorage();
  const currentVisibility = getEmployeeVisibilityMap();
  const nextVisibility = {
    ...currentVisibility,
    [employeeId]: visible,
  };

  storage?.setItem(EMPLOYEE_VISIBILITY_STORAGE_KEY, JSON.stringify(nextVisibility));
  return nextVisibility;
};

export const isEmployeeVisibleInJobAssignment = (employeeId) => {
  const visibilityMap = getEmployeeVisibilityMap();
  return visibilityMap[employeeId] !== false;
};

export const decorateEmployeesWithVisibility = (employees = []) =>
  employees.map((employee) => ({
    ...employee,
    visibleInJobAssignment: isEmployeeVisibleInJobAssignment(employee.id),
  }));

export const getAllAssigneeDirectory = (employees = []) => [
  ...decorateEmployeesWithVisibility(employees),
  ...getPartTimers(),
];

export const getVisibleAssigneeOptions = (employees = []) => {
  const visibleEmployees = decorateEmployeesWithVisibility(employees)
    .filter((employee) => employee.visibleInJobAssignment !== false);
  const visiblePartTimers = getPartTimers().filter((employee) => employee.visibleInJobAssignment !== false);

  return [...visibleEmployees, ...visiblePartTimers];
};

export const mapAssignedEmployeeDetails = (assignedIds = [], employees = []) => {
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));

  return assignedIds
    .map((employeeId) => employeesById.get(employeeId))
    .filter(Boolean);
};
