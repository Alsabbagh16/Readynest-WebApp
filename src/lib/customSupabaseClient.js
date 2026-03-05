import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rajqootheupvbejwfrgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhanFvb3RoZXVwdmJlandmcmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NjAwMjgsImV4cCI6MjA2MjEzNjAyOH0.3CEqEf1uy23CKt4rTSoATGb93rEpNzEmXobkO-eOopw';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
