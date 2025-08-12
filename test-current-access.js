// Quick test to see what's accessible right now
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testCurrentAccess() {
  console.log('=== TESTING CURRENT ACCESS ===\n');
  
  // 1. Check session
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Session:', session ? `Logged in as ${session.user.email}` : 'Not logged in');
  
  if (!session) {
    console.log('\n⚠️  You need to be logged in. Please log into the OCMA app first.');
    return;
  }
  
  // 2. Try to read organizations
  console.log('\n2. Testing organization access...');
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('*');
  
  if (orgError) {
    console.error('❌ Cannot read organizations:', orgError.message);
    console.log('Error code:', orgError.code);
    console.log('Error hint:', orgError.hint);
  } else {
    console.log(`✅ Can read organizations: ${orgs?.length || 0} found`);
    orgs?.forEach(org => {
      console.log(`  - ${org.name} (${org.status})`);
    });
  }
  
  // 3. Try to read memberships
  console.log('\n3. Testing membership access...');
  const { data: members, error: memberError } = await supabase
    .from('organization_members')
    .select('*');
  
  if (memberError) {
    console.error('❌ Cannot read memberships:', memberError.message);
  } else {
    console.log(`✅ Can read memberships: ${members?.length || 0} found`);
  }
  
  // 4. Try to read settings
  console.log('\n4. Testing settings access...');
  const { data: settings, error: settingsError } = await supabase
    .from('system_settings')
    .select('*');
  
  if (settingsError) {
    console.error('❌ Cannot read settings:', settingsError.message);
  } else {
    console.log(`✅ Can read settings: ${settings?.length || 0} found`);
  }
  
  // 5. Try to create a test organization
  console.log('\n5. Testing organization creation...');
  const testName = `Test Org ${Date.now()}`;
  const { data: newOrg, error: createError } = await supabase
    .from('organizations')
    .insert({
      name: testName,
      description: 'Test organization',
      status: 'active'
    })
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Cannot create organization:', createError.message);
    console.log('Error code:', createError.code);
  } else {
    console.log('✅ Successfully created organization:', newOrg.name);
    
    // Try to delete it
    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', newOrg.id);
    
    if (deleteError) {
      console.log('Could not clean up test org:', deleteError.message);
    } else {
      console.log('Cleaned up test organization');
    }
  }
  
  console.log('\n=== SUMMARY ===');
  if (!orgError && !memberError && !settingsError) {
    console.log('✅ All access working! You should be able to use the app normally.');
  } else {
    console.log('❌ Access issues detected. Run emergency-fix-rls.sql in Supabase.');
  }
}

testCurrentAccess().catch(console.error);