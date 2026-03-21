import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobRecord {
  job_ref_id: string;
  user_name: string;
  user_email: string;
  preferred_date: string;
  user_address: {
    street: string;
    city: string;
    zip: string;
    phone: string;
  };
  status?: string;
  notes?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { record }: { record: JobRecord } = await req.json();

    if (!record || !record.user_email || !record.job_ref_id) {
      return new Response(
        JSON.stringify({ error: 'Job record with email and job_ref_id is required' }),
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

    const formattedDate = record.preferred_date 
      ? new Date(record.preferred_date).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'To be confirmed';

    const address = record.user_address 
      ? `${record.user_address.street}, ${record.user_address.city}, ${record.user_address.zip}`
      : 'Address on file';

    // Send confirmation email to customer
    const customerEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ReadyNest <noreply@readynest.com>',
        to: [record.user_email],
        subject: `Job Scheduled - ${record.job_ref_id}`,
        html: `
          <h2>Your Job Has Been Scheduled!</h2>
          <p>Hello ${record.user_name || 'Valued Customer'},</p>
          <p>Your cleaning service has been scheduled. Here are the details:</p>
          <hr />
          <p><strong>Job Reference:</strong> ${record.job_ref_id}</p>
          <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
          <p><strong>Address:</strong> ${address}</p>
          <p><strong>Status:</strong> ${record.status || 'Scheduled'}</p>
          ${record.notes ? `<p><strong>Notes:</strong> ${record.notes}</p>` : ''}
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
        subject: `New Job Created - ${record.job_ref_id}`,
        html: `
          <h2>New Job Created</h2>
          <p><strong>Job Reference:</strong> ${record.job_ref_id}</p>
          <p><strong>Customer:</strong> ${record.user_name || 'N/A'}</p>
          <p><strong>Email:</strong> ${record.user_email}</p>
          <p><strong>Phone:</strong> ${record.user_address?.phone || 'N/A'}</p>
          <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
          <p><strong>Address:</strong> ${address}</p>
          <p><strong>Status:</strong> ${record.status || 'Scheduled'}</p>
          ${record.notes ? `<p><strong>Notes:</strong> ${record.notes}</p>` : ''}
        `,
      }),
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Job confirmation emails sent successfully' }),
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
