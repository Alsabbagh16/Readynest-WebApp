import { supabase } from '@/lib/supabase';

/**
 * WhatsApp Messaging Service
 * Sends automated WhatsApp notifications via Supabase Edge Function
 */

/**
 * Send WhatsApp notification for a new purchase/booking
 * @param {Object} purchaseData - Purchase details
 * @param {string} purchaseData.customerName - Customer's name
 * @param {string} purchaseData.customerPhone - Customer's phone number
 * @param {string} purchaseData.bookingDate - Formatted booking date
 * @param {string} purchaseData.bookingTime - Formatted booking time
 * @param {string} purchaseData.amount - Total amount
 * @param {string} purchaseData.referenceId - Purchase reference ID
 */
export const sendPurchaseNotification = async (purchaseData) => {
  try {
    const { customerName, customerPhone, bookingDate, bookingTime, amount, referenceId } = purchaseData;
    
    if (!customerPhone) {
      console.warn('No customer phone provided for WhatsApp notification');
      return { success: false, error: 'No phone number provided' };
    }

    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        messageType: 'purchase_confirmation',
        recipientPhone: customerPhone,
        templateVariables: [
          customerName || 'Valued Customer',
          referenceId || 'N/A',
          `${bookingDate || 'TBD'}, ${bookingTime || 'TBD'}`,
          amount || '0'
        ],
        sendToAdmin: true
      }
    });

    if (error) {
      console.error('WhatsApp purchase notification error:', error);
      return { success: false, error: error.message };
    }

    console.log('WhatsApp purchase notification sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send WhatsApp purchase notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send WhatsApp notification for a new job creation
 * @param {Object} jobData - Job details
 * @param {string} jobData.jobRefId - Job reference ID
 * @param {string} jobData.customerName - Customer's name
 * @param {string} jobData.customerPhone - Customer's phone number
 * @param {string} jobData.scheduledDate - Formatted scheduled date/time
 * @param {string} jobData.address - Service address
 */
export const sendJobCreatedNotification = async (jobData) => {
  try {
    const { jobRefId, customerName, customerPhone, scheduledDate, address } = jobData;
    
    if (!customerPhone) {
      console.warn('No customer phone provided for WhatsApp job notification');
      return { success: false, error: 'No phone number provided' };
    }

    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        messageType: 'job_created',
        recipientPhone: customerPhone,
        templateVariables: [
          jobRefId || 'N/A',
          customerName || 'Valued Customer',
          scheduledDate || 'TBD',
          address || 'Address on file'
        ],
        sendToAdmin: true
      }
    });

    if (error) {
      console.error('WhatsApp job notification error:', error);
      return { success: false, error: error.message };
    }

    console.log('WhatsApp job notification sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send WhatsApp job notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send WhatsApp notification for a contact form submission
 * @param {Object} contactData - Contact form details
 * @param {string} contactData.name - Contact's name
 * @param {string} contactData.email - Contact's email
 * @param {string} contactData.phone - Contact's phone number
 * @param {string} contactData.message - Message content (truncated)
 */
export const sendContactReportNotification = async (contactData) => {
  try {
    const { name, email, phone, message } = contactData;
    
    // For contact reports, we primarily notify admin
    // Customer notification is optional (they may not have WhatsApp)
    const adminPhone = phone; // Use the contact's phone to also send them confirmation
    
    if (!phone) {
      console.warn('No phone provided for WhatsApp contact notification');
      return { success: false, error: 'No phone number provided' };
    }

    // Truncate message to fit template (WhatsApp has limits)
    const truncatedMessage = message && message.length > 100 
      ? message.substring(0, 97) + '...' 
      : (message || 'No message');

    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        messageType: 'contact_report',
        recipientPhone: phone,
        templateVariables: [
          name || 'Anonymous',
          email || 'Not provided',
          phone || 'Not provided',
          truncatedMessage
        ],
        sendToAdmin: true
      }
    });

    if (error) {
      console.error('WhatsApp contact notification error:', error);
      return { success: false, error: error.message };
    }

    console.log('WhatsApp contact notification sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send WhatsApp contact notification:', error);
    return { success: false, error: error.message };
  }
};
