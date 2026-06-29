import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const generatePassword = () => {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const randomPart = btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '');
  return `${randomPart}Aa1!`;
};

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authorization = request.headers.get('Authorization');
    if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: 'Supabase environment is not configured.' }, 500);
    if (!authorization) return json({ error: 'Authentication required.' }, 401);

    const requestingClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: { user: requestingUser }, error: requestingUserError } = await requestingClient.auth.getUser();
    if (requestingUserError || !requestingUser) return json({ error: 'Authentication required.' }, 401);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('id', requestingUser.id)
      .maybeSingle();
    if (!employee || !['admin', 'superadmin', 'staff'].includes(String(employee.role).toLowerCase())) {
      return json({ error: 'Customer creation permission required.', stage: 'authorization' }, 403);
    }

    const { userData } = await request.json();
    if (!userData?.email || !userData?.first_name) {
      return json({ error: 'Name and email are required.' }, 400);
    }

    const email = userData.email.trim().toLowerCase();
    const phone = userData.phone.trim();
    const { data: emailMatch } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .limit(1);
    const { data: phoneMatch } = phone
      ? await supabaseAdmin.from('profiles').select('id').eq('phone', phone).limit(1)
      : { data: [] };
    if (emailMatch?.length || phoneMatch?.length) {
      return json({ success: false, code: 'USER_EXISTS', error: 'User exists, please select customer.' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userData.password || generatePassword(),
      email_confirm: true,
      user_metadata: {
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        phone,
        user_type: userData.user_type || 'Personal',
      },
    });
    if (authError) {
      console.error('Error creating auth user:', authError);
      if (authError.message.toLowerCase().includes('already')) {
        return json({ success: false, code: 'USER_EXISTS', error: 'User exists, please select customer.' });
      }
      return json({ error: `Failed to create user: ${authError.message}`, stage: 'authentication' }, 500);
    }
    if (!authData.user) return json({ error: 'Failed to create user.' }, 500);

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      email,
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      phone,
      user_type: userData.user_type || 'Personal',
      credits: userData.credits || 0,
      is_subscriber: userData.is_subscriber === true,
      subscription_plan_type: userData.is_subscriber ? (userData.subscription_plan_type || 'Weekly') : null,
      subscription_status: userData.is_subscriber ? 'unbooked' : null,
      subscription_started_at: userData.is_subscriber ? new Date().toISOString() : null,
    }, { onConflict: 'id' });
    if (profileError) {
      console.error('Error creating profile:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return json({ error: `Failed to create customer profile: ${profileError.message}`, stage: 'profile' }, 500);
    }

    let createdAddress = null;
    const address = userData.address;
    if (address?.street || address?.city || address?.zip) {
      const { data: addressData, error: addressError } = await supabaseAdmin.from('addresses').insert({
        id: crypto.randomUUID(),
        user_id: authData.user.id,
        street: address.street || null,
        city: address.city || null,
        zip: address.zip || null,
        phone: address.phone || phone,
        alt_phone: address.alt_phone || null,
      }).select().single();
      if (addressError) {
        console.error('Error creating customer address:', addressError);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return json({ error: `Failed to save customer address: ${addressError.message}`, stage: 'address' }, 500);
      }
      createdAddress = addressData;
    }

    return json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone,
        user_type: userData.user_type || 'Personal',
        credits: userData.credits || 0,
        is_subscriber: userData.is_subscriber === true,
        subscription_plan_type: userData.subscription_plan_type || null,
        created_at: authData.user.created_at,
        address: createdAddress,
      },
    });
  } catch (error) {
    console.error('Error in create-user function:', error);
    return json({ error: error instanceof Error ? error.message : 'Internal server error.' }, 500);
  }
});
