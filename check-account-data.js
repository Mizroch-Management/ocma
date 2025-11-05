import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAccount() {
  // Sign in as the user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'elimizroch@gmail.com',
    password: 'SCL2232'
  });
  
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  console.log('✓ Logged in as:', authData.user.email);
  
  // Check organizations
  const { data: orgs, error: orgsError } = await supabase
    .from('organization_members')
    .select('*, organizations(*)')
    .eq('user_id', authData.user.id);
  
  console.log('\nOrganizations:', orgs);
  
  // Check strategies
  if (orgs && orgs.length > 0) {
    const orgId = orgs[0].organization_id;
    const { data: strategies, error: stError } = await supabase
      .from('strategies')
      .select('*')
      .eq('organization_id', orgId);
    
    console.log('\nStrategies:', strategies);
  }
}

checkAccount().catch(console.error);
