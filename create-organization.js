// Create an organization so Settings will work
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createOrgAndTest() {
  console.log('=== FIXING ORGANIZATION REQUIREMENT ===\n');
  
  // 1. Sign in as test user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@ocma-app.com',
    password: 'TestPassword123!'
  });
  
  if (authError) {
    console.error('❌ Cannot sign in:', authError.message);
    return;
  }
  
  console.log('✅ Signed in as:', authData.user?.email);
  
  // 2. Create an organization
  console.log('\n1. Creating organization...');
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: 'Default Organization',
      description: 'Default organization for API key management',
      status: 'active'
    })
    .select()
    .single();
  
  if (orgError) {
    console.error('❌ Cannot create organization:', orgError.message);
    return;
  }
  
  console.log('✅ Created organization:', orgData.name, 'ID:', orgData.id);
  
  // 3. Add user as owner of the organization
  console.log('\n2. Adding user as organization owner...');
  const { data: memberData, error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: orgData.id,
      user_id: authData.user.id,
      role: 'owner',
      status: 'active'
    })
    .select();
  
  if (memberError) {
    console.error('❌ Cannot add member:', memberError.message);
    return;
  }
  
  console.log('✅ User added as owner');
  
  // 4. Now test saving a setting
  console.log('\n3. Testing setting save with organization...');
  const { data: settingData, error: settingError } = await supabase
    .from('system_settings')
    .insert({
      setting_key: 'openai_api_key',
      setting_value: { api_key: 'sk-test-with-org-12345' },
      category: 'ai_platforms',
      description: 'OpenAI API Key',
      organization_id: orgData.id  // Now with organization ID
    })
    .select();
  
  if (settingError) {
    console.error('❌ Setting save failed:', settingError.message);
  } else {
    console.log('✅ Setting saved successfully with organization!');
    
    // Clean up the test setting
    await supabase
      .from('system_settings')
      .delete()
      .eq('setting_key', 'openai_api_key')
      .eq('organization_id', orgData.id);
  }
  
  console.log('\n=== SOLUTION ===');
  console.log('The Settings page requires an organization. Now you need to:');
  console.log('1. Go to the OCMA app');
  console.log('2. Navigate to Organizations page');
  console.log('3. Create or join an organization');
  console.log('4. THEN go to Settings and add your API keys');
  console.log('\nAlternatively, I can create real settings for your organization now...');
  
  return orgData.id;
}

createOrgAndTest().catch(console.error);