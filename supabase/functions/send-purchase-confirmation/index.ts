import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PurchaseRecord {
  purchase_ref_id: string;
  name: string;
  email: string;
  user_phone: string;
  product_name: string;
  paid_amount: number;
  booking_date: string;
  booking_start_time: string;
  booking_end_time: string;
  address: string;
  cleaners?: number;
  hours?: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { record }: { record: PurchaseRecord } = await req.json();

    if (!record || !record.email || !record.purchase_ref_id) {
      return new Response(
        JSON.stringify({ error: 'Purchase record with email and purchase_ref_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@readynest.com';

    if (!RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const bookingDateTime = record.booking_date 
      ? `${record.booking_date}, ${record.booking_start_time || ''} - ${record.booking_end_time || ''}`
      : 'To be confirmed';

    // Send confirmation email to customer
    const customerEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ReadyNest <noreply@readynest.com>',
        to: [record.email],
        subject: `Booking Confirmed - ${record.purchase_ref_id}`,
        html: `
          <h2>Your Booking Has Been Confirmed!</h2>
          <p>Hello ${record.name || 'Valued Customer'},</p>
          <p>Thank you for your booking. Here are the details:</p>
          <hr />
          <p><strong>Reference ID:</strong> ${record.purchase_ref_id}</p>
          <p><strong>Service:</strong> ${record.product_name || 'Cleaning Service'}</p>
          <p><strong>Date & Time:</strong> ${bookingDateTime}</p>
          <p><strong>Address:</strong> ${record.address || 'Address on file'}</p>
          ${record.cleaners ? `<p><strong>Cleaners:</strong> ${record.cleaners}</p>` : ''}
          ${record.hours ? `<p><strong>Hours:</strong> ${record.hours}</p>` : ''}
          <p><strong>Amount:</strong> ${record.paid_amount || 0} BHD</p>
          <hr />
          <p>If you need to make any changes, please contact us.</p>
          <p>Best regards,<br>The ReadyNest Team</p>
        `,
      }),
    });

    if (!customerEmailResponse.ok) {
      const errorData = await customerEmailResponse.json();
      console.error('Resend API error (customer):', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send customer email', details: errorData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Send notification email to admin
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ReadyNest System <noreply@readynest.com>',
        to: [ADMIN_EMAIL],
        subject: `New Booking - ${record.purchase_ref_id}`,
        html: `
          <h2>New Booking Received</h2>
          <p><strong>Reference ID:</strong> ${record.purchase_ref_id}</p>
          <p><strong>Customer:</strong> ${record.name || 'N/A'}</p>
          <p><strong>Email:</strong> ${record.email}</p>
          <p><strong>Phone:</strong> ${record.user_phone || 'N/A'}</p>
          <p><strong>Service:</strong> ${record.product_name || 'Cleaning Service'}</p>
          <p><strong>Date & Time:</strong> ${bookingDateTime}</p>
          <p><strong>Address:</strong> ${record.address || 'N/A'}</p>
          ${record.cleaners ? `<p><strong>Cleaners:</strong> ${record.cleaners}</p>` : ''}
          ${record.hours ? `<p><strong>Hours:</strong> ${record.hours}</p>` : ''}
          <p><strong>Amount:</strong> ${record.paid_amount || 0} BHD</p>
        `,
      }),
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Purchase confirmation emails sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
