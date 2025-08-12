// Debug OpenAI test failure after creating organization
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugTestFailure() {
  console.log('=== DEBUGGING OPENAI TEST FAILURE ===\n');
  
  // 1. Check current state
  console.log('1. Checking current organizations and settings...');
  
  const { data: orgs } = await supabase.from('organizations').select('*');
  const { data: settings } = await supabase.from('system_settings').select('*');
  
  console.log(`Organizations: ${orgs?.length || 0}`);
  orgs?.forEach(org => {
    console.log(`  - ${org.name} (ID: ${org.id})`);
  });
  
  console.log(`\nSettings: ${settings?.length || 0}`);
  const openaiSettings = settings?.filter(s => s.setting_key === 'openai_api_key') || [];
  console.log(`OpenAI settings: ${openaiSettings.length}`);
  
  openaiSettings.forEach((setting, i) => {
    const apiKey = setting.setting_value?.api_key;
    console.log(`\nOpenAI Setting #${i + 1}:`);
    console.log(`  - Organization: ${setting.organization_id || 'global'}`);
    console.log(`  - Key format: ${apiKey ? `${apiKey.substring(0, 15)}...` : 'MISSING'}`);
    console.log(`  - Key length: ${apiKey ? apiKey.length : 0}`);
    console.log(`  - Starts with sk-: ${apiKey ? apiKey.startsWith('sk-') : false}`);
    
    if (apiKey) {
      // Test the key directly
      console.log(`\n  Testing key directly against OpenAI...`);
      testOpenAIKey(apiKey);
    }
  });
  
  // 2. If no settings, something is still wrong
  if (openaiSettings.length === 0) {
    console.log('\n❌ NO OPENAI SETTINGS FOUND!');
    console.log('This means the Settings page is still not saving properly.');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure you are LOGGED IN to the OCMA app');
    console.log('2. Make sure you SELECTED the organization you created');
    console.log('3. Try entering the API key again');
    console.log('4. Check browser console for JavaScript errors');
  }
  
  // 3. Test the edge function directly
  if (openaiSettings.length > 0) {
    console.log('\n2. Testing through Supabase edge function...');
    const testKey = openaiSettings[0].setting_value?.api_key;
    
    const { data: testResult, error: testError } = await supabase.functions.invoke('test-platform-config', {
      body: {
        platform: 'openai',
        type: 'ai_platform',
        api_key: testKey
      }
    });
    
    if (testError) {
      console.log('❌ Edge function error:', testError.message);
    } else {
      console.log('Edge function result:');
      console.log(JSON.stringify(testResult, null, 2));
    }
  }
}

async function testOpenAIKey(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (response.ok) {
      console.log('  ✅ Key works directly!');
    } else {
      console.log(`  ❌ Key fails: ${response.status}`);
      const error = await response.text();
      console.log(`  Error: ${error}`);
    }
  } catch (err) {
    console.log(`  ❌ Network error: ${err.message}`);
  }
}

debugTestFailure().catch(console.error);