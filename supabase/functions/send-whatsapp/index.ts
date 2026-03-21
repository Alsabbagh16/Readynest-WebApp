import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppRequest {
  messageType: 'purchase_confirmation' | 'job_created' | 'contact_report';
  recipientPhone: string;
  templateVariables: string[];
  sendToAdmin?: boolean;
}

// Format phone number to WhatsApp format (with country code, no + or spaces)
const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 00, remove it
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // If doesn't start with country code (assuming Bahrain 973), add it
  if (!cleaned.startsWith('973') && cleaned.length <= 8) {
    cleaned = '973' + cleaned;
  }
  
  return cleaned;
}

// Send WhatsApp message via Facebook Graph API
const sendWhatsAppMessage = async (
  recipientPhone: string,
  templateName: string,
  templateVariables: string[],
  phoneNumberId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string; messageId?: string }> => {
  try {
    const formattedPhone = formatPhoneNumber(recipientPhone);
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en'
            },
            components: [
              {
                type: 'body',
                parameters: templateVariables.map(variable => ({
                  type: 'text',
                  text: variable
                }))
              }
            ]
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      return { 
        success: false, 
        error: data.error?.message || 'Failed to send WhatsApp message' 
      };
    }

    return { 
      success: true, 
      messageId: data.messages?.[0]?.id 
    };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messageType, recipientPhone, templateVariables, sendToAdmin = true }: WhatsAppRequest = await req.json();

    // Validate required fields
    if (!messageType || !recipientPhone || !templateVariables) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: messageType, recipientPhone, templateVariables' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get credentials from environment
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const adminPhone = Deno.env.get('WHATSAPP_ADMIN_PHONE');

    if (!phoneNumberId || !accessToken) {
      console.error('Missing WhatsApp credentials');
      return new Response(
        JSON.stringify({ error: 'WhatsApp credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Map message type to template name
    const templateMap: Record<string, string> = {
      'purchase_confirmation': 'purchase_confirmation',
      'job_created': 'job_created',
      'contact_report': 'contact_report'
    };

    const templateName = templateMap[messageType];
    if (!templateName) {
      return new Response(
        JSON.stringify({ error: `Invalid message type: ${messageType}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const results: { customer?: any; admin?: any } = {};

    // Send to customer
    console.log(`Sending ${messageType} to customer: ${recipientPhone}`);
    const customerResult = await sendWhatsAppMessage(
      recipientPhone,
      templateName,
      templateVariables,
      phoneNumberId,
      accessToken
    );
    results.customer = customerResult;

    // Send to admin if enabled and admin phone is configured
    if (sendToAdmin && adminPhone) {
      console.log(`Sending ${messageType} notification to admin: ${adminPhone}`);
      const adminResult = await sendWhatsAppMessage(
        adminPhone,
        templateName,
        templateVariables,
        phoneNumberId,
        accessToken
      );
      results.admin = adminResult;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: 'WhatsApp messages sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
