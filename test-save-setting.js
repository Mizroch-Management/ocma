// Test saving a setting to the database
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSaveSetting() {
  console.log('=== Testing Setting Save ===\n');
  
  // Try to save a test OpenAI API key
  const testSetting = {
    setting_key: 'openai_api_key',
    setting_value: { api_key: 'sk-test-12345' },
    category: 'ai_platforms',
    description: 'OpenAI API Key',
    organization_id: null // Global setting
  };
  
  console.log('Attempting to save:', testSetting);
  
  const { data, error } = await supabase
    .from('system_settings')
    .insert(testSetting)
    .select();
  
  if (error) {
    console.error('\n❌ Error saving setting:', error);
    console.log('\nError details:');
    console.log('- Code:', error.code);
    console.log('- Message:', error.message);
    console.log('- Details:', error.details);
    console.log('- Hint:', error.hint);
    
    // Check if it's a permissions issue
    if (error.code === '42501') {
      console.log('\n⚠️  This is a PERMISSIONS error - the database doesn\'t allow inserts');
      console.log('The RLS (Row Level Security) policies might be blocking the insert');
    }
  } else {
    console.log('\n✅ Successfully saved:', data);
  }
  
  // Also check if we can read
  console.log('\n=== Testing Read Access ===');
  const { data: readData, error: readError } = await supabase
    .from('system_settings')
    .select('*')
    .limit(1);
  
  if (readError) {
    console.log('❌ Cannot read settings:', readError.message);
  } else {
    console.log('✅ Can read settings. Count:', readData?.length || 0);
  }
  
  // Check auth status
  console.log('\n=== Checking Auth Status ===');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.log('❌ Not authenticated - this might be why saves are failing');
    console.log('Auth error:', authError?.message);
  } else {
    console.log('✅ Authenticated as:', user.email);
    console.log('User ID:', user.id);
  }
}

testSaveSetting().catch(console.error);