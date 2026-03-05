
import { format as formatTz, utcToZonedTime } from 'date-fns-tz';

/**
 * Format preferred_booking_date from UTC ISO string to Asia/Bahrain (UTC+3) display format
 * @param {string} dateString - ISO string or null
 * @returns {string} Formatted string or "—"
 */
export const formatPreferredBookingDateForAdmin = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    
    const timeZone = 'Asia/Bahrain';
    const zonedDate = utcToZonedTime(date, timeZone);
    const formatted = formatTz(zonedDate, 'yyyy-MM-dd hh:mm a', { timeZone });
    
    console.log(`[dateTimeHelpers Display] Raw: ${dateString} | TZ: ${timeZone} | Formatted: ${formatted}`);
    
    return formatted;
  } catch (error) {
    console.error("[dateTimeHelpers] Error formatting date:", error);
    return '—';
  }
};

/**
 * Format preferred_booking_date from UTC ISO string to Asia/Bahrain (UTC+3) for datetime-local input
 * @param {string} dateString - ISO string or null
 * @returns {string} Formatted string "YYYY-MM-DDTHH:mm" or ""
 */
export const toLocalDatetimeInputString = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        const timeZone = 'Asia/Bahrain';
        const zonedDate = utcToZonedTime(date, timeZone);
        const formatted = formatTz(zonedDate, "yyyy-MM-dd'T'HH:mm", { timeZone });
        
        console.log(`[dateTimeHelpers Autofill] Raw: ${dateString} | TZ: ${timeZone} | InputValue: ${formatted}`);
        
        return formatted;
    } catch (error) {
        console.error("[dateTimeHelpers] Error formatting date for input:", error);
        return '';
    }
};
