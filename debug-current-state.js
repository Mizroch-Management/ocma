// Debug the current state after all fixes
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugCurrentState() {
  console.log('=== DEBUGGING CURRENT STATE AFTER ALL FIXES ===\n');
  
  // 1. Check organizations
  console.log('1. Checking organizations...');
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('*');
  
  if (orgError) {
    console.error('❌ Cannot read organizations:', orgError.message);
  } else {
    console.log(`✅ Found ${orgs?.length || 0} organizations:`);
    orgs?.forEach(org => {
      console.log(`  - ${org.name} (ID: ${org.id}) - Status: ${org.status}`);
    });
  }
  
  // 2. Check organization members
  console.log('\n2. Checking organization members...');
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select('*, organizations(name)');
  
  if (membersError) {
    console.error('❌ Cannot read members:', membersError.message);
  } else {
    console.log(`✅ Found ${members?.length || 0} memberships:`);
    members?.forEach(member => {
      console.log(`  - User ${member.user_id} is ${member.role} of ${member.organizations?.name} (${member.status})`);
    });
  }
  
  // 3. Check settings
  console.log('\n3. Checking system settings...');
  const { data: settings, error: settingsError } = await supabase
    .from('system_settings')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (settingsError) {
    console.error('❌ Cannot read settings:', settingsError.message);
  } else {
    console.log(`✅ Found ${settings?.length || 0} settings:`);
    
    const openaiSettings = settings?.filter(s => s.setting_key === 'openai_api_key') || [];
    const twitterSettings = settings?.filter(s => s.setting_key === 'twitter_integration') || [];
    
    console.log(`\nOpenAI settings: ${openaiSettings.length}`);
    openaiSettings.forEach((s, i) => {
      console.log(`  OpenAI #${i + 1}: Org=${s.organization_id || 'global'}, Key=${s.setting_value?.api_key ? 'SET' : 'MISSING'}`);
    });
    
    console.log(`\nTwitter settings: ${twitterSettings.length}`);
    twitterSettings.forEach((s, i) => {
      console.log(`  Twitter #${i + 1}: Org=${s.organization_id || 'global'}, Connected=${s.setting_value?.connected || false}`);
    });
  }
  
  // 4. Test creating organization if none exist
  if (!orgs || orgs.length === 0) {
    console.log('\n4. No organizations found - testing creation...');
    
    // Sign in first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@ocma-app.com',
      password: 'TestPassword123!'
    });
    
    if (authError) {
      console.log('Creating test user...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'test@ocma-app.com',
        password: 'TestPassword123!'
      });
      
      if (signUpError) {
        console.error('❌ Cannot create user:', signUpError.message);
        return;
      }
    }
    
    // Try to create organization
    const { data: newOrg, error: createOrgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Test Organization',
        description: 'Test organization for debugging',
        status: 'active'
      })
      .select()
      .single();
    
    if (createOrgError) {
      console.error('❌ Cannot create organization:', createOrgError.message);
      console.log('RLS policies might still be blocking organization creation');
    } else {
      console.log('✅ Successfully created test organization:', newOrg.name);
    }
  }
  
  // 5. Show what the user needs to do
  console.log('\n=== WHAT TO DO NEXT ===');
  if (!orgs || orgs.length === 0) {
    console.log('❌ NO ORGANIZATIONS EXIST');
    console.log('You must:');
    console.log('1. Go to OCMA app → Organizations page');
    console.log('2. Create an organization');
    console.log('3. Then go to Settings');
  } else {
    console.log('✅ Organizations exist');
    console.log('Make sure in the OCMA app you:');
    console.log('1. Are logged in');
    console.log('2. Have selected an organization');
    console.log('3. Are an owner/admin of that organization');
    console.log('4. Then try Settings again');
  }
}

debugCurrentState().catch(console.error);