/**
 * Constants for the valid operating window.
 */
export const VALID_START_TIME = "08:30";
export const VALID_END_TIME = "17:00";

/**
 * Validates if a given date time string falls within the allowed operating window (08:30 - 17:00).
 * Logic:
 * - Expects raw datetime string "YYYY-MM-DDTHH:mm" (or similar)
 * - Parses manually to avoid any timezone shifts
 * - Checks if time is within allowed range.
 * 
 * @param {string} dateTime - The date time string to validate
 * @returns {{isValid: boolean, error: string|null, validStart: string, validEnd: string}}
 */
export const validateBookingTime = (dateTime) => {
  const result = {
    isValid: true,
    error: null,
    validStart: VALID_START_TIME,
    validEnd: VALID_END_TIME
  };

  if (!dateTime) {
    result.isValid = false;
    result.error = "Date and time are required.";
    return result;
  }
  
  // Use string parsing for hours/minutes to avoid timezone issues
  // Expecting format YYYY-MM-DDTHH:mm
  // We remove Z just in case
  const cleanTime = dateTime.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
  const timePart = cleanTime.split('T')[1];
  
  if (!timePart) {
      result.isValid = false;
      result.error = "Invalid time format.";
      return result;
  }

  const [hoursStr, minutesStr] = timePart.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (isNaN(hours) || isNaN(minutes)) {
      result.isValid = false;
      result.error = "Invalid time values.";
      return result;
  }

  const totalMinutes = hours * 60 + minutes;

  const startTotalMinutes = 8 * 60 + 30; // 08:30 = 510 minutes
  const endTotalMinutes = 17 * 60;       // 17:00 = 1020 minutes

  const ERROR_MSG = `Please choose a time between ${VALID_START_TIME} and ${VALID_END_TIME}.`;

  if (totalMinutes < startTotalMinutes || totalMinutes >= endTotalMinutes) {
    result.isValid = false;
    result.error = ERROR_MSG;
  }

  return result;
};

/**
 * Validates a time range. Primarily validates the start time against operating hours.
 * 
 * @param {string} startTime 
 * @param {string} endTime 
 * @returns {{isValid: boolean, error: string|null, validStart: string, validEnd: string}}
 */
export const validateBookingTimeRange = (startTime, endTime) => {
    // Validate start time first
    const startValidation = validateBookingTime(startTime);
    if (!startValidation.isValid) return startValidation;

    if (endTime) {
        // Simple string comparison for start vs end works for same-day ISO strings
        // But better to be safe with parsing if needed. 
        // For basic validation, if start is valid, we assume range logic is handled elsewhere or is ok.
        // If exact comparison needed, we strip Z and compare strings directly.
        
        const cleanStart = startTime.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
        const cleanEnd = endTime.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
        
        if (cleanEnd <= cleanStart) {
             return { ...startValidation, isValid: false, error: "End time must be after start time." };
        }
    }

    return startValidation;
};

/**
 * Returns the valid time range constants.
 */
export const getValidTimeRange = () => {
    return {
        start: VALID_START_TIME,
        end: VALID_END_TIME
    };
};