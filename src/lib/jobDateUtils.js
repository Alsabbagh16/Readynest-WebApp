const TIMEZONE_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/;

// Job dates are stored as UTC-looking strings, but the date/time entered by the
// admin is the face value that should be shown in the scheduling UI.
export const stripJobTimezone = (dateString) => (
  dateString?.replace(TIMEZONE_SUFFIX, '') || ''
);

export const parseJobFaceValueDate = (dateString) => {
  const cleanDateString = stripJobTimezone(dateString);
  if (!cleanDateString) return null;

  const parsedDate = new Date(cleanDateString);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const getJobDateKey = (dateString) => {
  const parsedDate = parseJobFaceValueDate(dateString);
  if (!parsedDate) return '';

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
