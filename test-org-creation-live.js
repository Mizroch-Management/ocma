// Test organization creation with proper authentication
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testOrgCreation() {
  console.log('=== TESTING ORGANIZATION CREATION FLOW ===\n');
  
  // 1. Check if there's an active session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('❌ No active session. You must be logged in to create organizations.');
    console.log('\nTrying to sign in with test account...');
    
    // Try to sign in with a test account
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'elimizroch@gmail.com',
      password: 'your_password_here' // User needs to provide this
    });
    
    if (authError) {
      console.error('❌ Failed to sign in:', authError.message);
      console.log('\n⚠️  Please log into the OCMA app first, then run this test again.');
      return;
    }
    
    console.log('✅ Signed in successfully');
  } else {
    console.log('✅ Active session found for:', session.user.email);
  }
  
  // 2. Try to create an organization exactly like the frontend does
  const testOrgName = `Test Org ${Date.now()}`;
  const slug = testOrgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  console.log('\n2. Creating organization:', testOrgName);
  
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: testOrgName,
      description: 'Test organization created via script',
      slug: slug,
      status: 'active' // Setting as active for testing
    })
    .select()
    .single();
  
  if (orgError) {
    console.error('❌ Failed to create organization:', orgError);
    console.log('\nError details:');
    console.log('  Code:', orgError.code);
    console.log('  Message:', orgError.message);
    console.log('  Details:', orgError.details);
    console.log('  Hint:', orgError.hint);
    
    if (orgError.code === '42501') {
      console.log('\n⚠️  Permission denied! RLS policies are blocking organization creation.');
      console.log('This is the root cause of your issue.');
    }
    return;
  }
  
  console.log('✅ Organization created successfully!');
  console.log('  ID:', orgData.id);
  console.log('  Name:', orgData.name);
  
  // 3. Try to add user as owner
  console.log('\n3. Adding user as organization owner...');
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('❌ No user found in session');
    return;
  }
  
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: orgData.id,
      user_id: user.id,
      role: 'owner',
      status: 'active'
    });
  
  if (memberError) {
    console.error('❌ Failed to add user as owner:', memberError);
    console.log('\nError details:');
    console.log('  Code:', memberError.code);
    console.log('  Message:', memberError.message);
    console.log('  Details:', memberError.details);
    console.log('  Hint:', memberError.hint);
    
    if (memberError.code === '42501') {
      console.log('\n⚠️  Permission denied! RLS policies are blocking membership creation.');
    }
    return;
  }
  
  console.log('✅ User added as organization owner');
  
  // 4. Try to save a test setting for this organization
  console.log('\n4. Testing settings save for new organization...');
  
  const { error: settingError } = await supabase
    .from('system_settings')
    .insert({
      setting_key: 'test_key',
      setting_value: { test: true },
      organization_id: orgData.id,
      category: 'test',
      description: 'Test setting'
    });
  
  if (settingError) {
    console.error('❌ Failed to save setting:', settingError);
    console.log('\nError details:');
    console.log('  Code:', settingError.code);
    console.log('  Message:', settingError.message);
    console.log('  Details:', settingError.details);
    console.log('  Hint:', settingError.hint);
    
    if (settingError.code === '42501') {
      console.log('\n⚠️  Permission denied! RLS policies are blocking settings save.');
    }
  } else {
    console.log('✅ Setting saved successfully!');
  }
  
  // 5. List all organizations to verify
  console.log('\n5. Verifying all organizations in database...');
  
  const { data: allOrgs, error: listError } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (listError) {
    console.error('❌ Failed to list organizations:', listError.message);
  } else {
    console.log(`Total organizations: ${allOrgs?.length || 0}`);
    allOrgs?.slice(0, 5).forEach(org => {
      console.log(`  - ${org.name} (Status: ${org.status}, Created: ${org.created_at})`);
    });
  }
  
  console.log('\n=== SUMMARY ===');
  if (orgData) {
    console.log('✅ Organization creation flow works!');
    console.log('The issue might be:');
    console.log('1. User is not properly authenticated in the browser');
    console.log('2. Session is not being passed correctly from frontend');
    console.log('3. Frontend state management issue');
  } else {
    console.log('❌ Organization creation failed - check RLS policies');
  }
}

testOrgCreation().catch(console.error);