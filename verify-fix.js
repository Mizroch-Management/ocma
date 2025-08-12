// Verify the RLS fix worked
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyFix() {
  console.log('=== Verifying RLS Fix ===\n');
  
  // First, sign in with a test user (you can use your actual credentials)
  // For testing, we'll try to create a test user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!'
  });
  
  if (authError) {
    console.log('Note: Could not create test user:', authError.message);
    console.log('Trying anonymous test...\n');
  } else {
    console.log('✅ Created test user for verification');
  }
  
  // Check if we can read settings now
  console.log('Testing READ access...');
  const { data: readData, error: readError } = await supabase
    .from('system_settings')
    .select('*');
  
  if (readError) {
    console.log('❌ Cannot read settings:', readError.message);
  } else {
    console.log('✅ Can read settings. Found:', readData?.length || 0, 'settings');
    if (readData && readData.length > 0) {
      readData.forEach(setting => {
        console.log(`  - ${setting.setting_key}: ${
          setting.setting_key.includes('api_key') ? 'SET' : 'configured'
        }`);
      });
    }
  }
  
  // Try to insert a test setting (will be deleted after)
  console.log('\nTesting WRITE access...');
  const testKey = `test_setting_${Date.now()}`;
  const { data: writeData, error: writeError } = await supabase
    .from('system_settings')
    .insert({
      setting_key: testKey,
      setting_value: { test: true },
      category: 'test',
      description: 'Test setting'
    })
    .select();
  
  if (writeError) {
    console.log('❌ Cannot write settings:', writeError.message);
    if (writeError.code === '42501') {
      console.log('\n⚠️  RLS policies are still blocking writes!');
      console.log('Make sure you ran the SQL fix in Supabase');
    }
  } else {
    console.log('✅ Can write settings successfully!');
    
    // Clean up test setting
    await supabase
      .from('system_settings')
      .delete()
      .eq('setting_key', testKey);
  }
  
  console.log('\n=== Summary ===');
  console.log('The Settings page should now work if:');
  console.log('1. You are logged in to the OCMA app');
  console.log('2. The RLS policies have been updated');
  console.log('\nNext steps:');
  console.log('1. Go to your OCMA app in the browser');
  console.log('2. Make sure you are logged in');
  console.log('3. Navigate to Settings');
  console.log('4. Add your OpenAI API key');
  console.log('5. Add your Twitter/X OAuth 2.0 User Context token');
  console.log('6. Test both configurations');
}

verifyFix().catch(console.error);