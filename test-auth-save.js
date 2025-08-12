// Test if we can actually save settings after logging in
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuthSave() {
  console.log('=== TESTING AUTHENTICATED SAVE ===\n');
  
  // Try to sign up/in a test user
  const testEmail = 'test@ocma-app.com';
  const testPassword = 'TestPassword123!';
  
  console.log('1. Attempting to sign up test user...');
  let { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      emailRedirectTo: undefined // Disable email confirmation for testing
    }
  });
  
  if (signUpError && signUpError.message.includes('already registered')) {
    console.log('User exists, trying to sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('❌ Cannot sign in:', signInError.message);
      return;
    }
    signUpData = signInData;
  } else if (signUpError) {
    console.error('❌ Cannot sign up:', signUpError.message);
    return;
  }
  
  console.log('✅ Authenticated as:', signUpData.user?.email);
  console.log('User ID:', signUpData.user?.id);
  
  // Now try to save a test OpenAI setting
  console.log('\n2. Attempting to save OpenAI API key...');
  const testApiKey = 'sk-test-12345-for-testing';
  
  const { data: saveData, error: saveError } = await supabase
    .from('system_settings')
    .insert({
      setting_key: 'openai_api_key',
      setting_value: { api_key: testApiKey },
      category: 'ai_platforms',
      description: 'OpenAI API Key',
      organization_id: null
    })
    .select();
  
  if (saveError) {
    console.error('❌ SAVE FAILED:', saveError.message);
    console.log('Error code:', saveError.code);
    
    if (saveError.code === '42501') {
      console.log('\n⚠️  RLS POLICY STILL BLOCKING!');
      console.log('The SQL fix might not have worked or there are additional requirements');
    }
  } else {
    console.log('✅ SAVE SUCCESSFUL!');
    console.log('Saved data:', saveData);
    
    // Clean up
    await supabase
      .from('system_settings')
      .delete()
      .eq('setting_key', 'openai_api_key')
      .eq('setting_value->api_key', testApiKey);
  }
  
  // Check current policies
  console.log('\n3. Current database state:');
  const { data: currentSettings } = await supabase
    .from('system_settings')
    .select('setting_key, organization_id')
    .limit(5);
  
  console.log('Settings count:', currentSettings?.length || 0);
  
  console.log('\n=== RESULT ===');
  if (saveError) {
    console.log('❌ The Settings page CANNOT save because of RLS policies');
    console.log('Need to run additional SQL fixes');
  } else {
    console.log('✅ Settings CAN be saved when authenticated');
    console.log('The issue might be:');
    console.log('1. You are not logged in to the app');
    console.log('2. The app is not sending authentication headers');
    console.log('3. The organization_id is required but missing');
  }
}

testAuthSave().catch(console.error);