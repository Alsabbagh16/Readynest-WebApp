import { v4 as uuidv4 } from 'uuid';

/**
 * Validates if a string is a valid UUID or a valid generated placeholder ("GEN-" prefix).
 * @param {string} value - The ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidUUID = (value) => {
  if (!value) return false;
  if (typeof value !== 'string') return false;

  // Allow generated IDs with "GEN-" prefix
  if (value.startsWith('GEN-')) {
    // Optional: could validate the UUID part after GEN- if stricter validation is needed
    // but for now, the prefix existence is sufficient for our logic
    return true; 
  }

  // Standard UUID regex (8-4-4-4-12 hex)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Generates a fallback purchase ID with "GEN-" prefix and a valid UUID.
 * Format: "GEN-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 * @returns {string}
 */
export const generateFallbackPurchaseId = () => {
  return `GEN-${uuidv4()}`;
};