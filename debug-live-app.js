// Debug what's happening when you test OpenAI in the live app
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugLiveApp() {
  console.log('=== DEBUGGING LIVE APP OPENAI ISSUE ===\n');
  
  // 1. Check ALL settings in database
  console.log('1. Checking ALL settings in database...');
  const { data: allSettings, error: settingsError } = await supabase
    .from('system_settings')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (settingsError) {
    console.error('❌ Cannot read settings:', settingsError);
    return;
  }
  
  console.log(`Found ${allSettings?.length || 0} total settings`);
  
  // Find OpenAI settings
  const openaiSettings = allSettings?.filter(s => s.setting_key === 'openai_api_key') || [];
  console.log(`\nOpenAI settings found: ${openaiSettings.length}`);
  
  openaiSettings.forEach((setting, i) => {
    console.log(`\nOpenAI Setting #${i + 1}:`);
    console.log(`- Organization ID: ${setting.organization_id || 'NULL (global)'}`);
    console.log(`- API Key: ${setting.setting_value?.api_key ? 
      setting.setting_value.api_key.substring(0, 15) + '...' : 'MISSING'}`);
    console.log(`- Created: ${setting.created_at}`);
  });
  
  // 2. Test the actual test-platform-config function
  console.log('\n\n2. Testing test-platform-config function...');
  
  if (openaiSettings.length > 0) {
    const testKey = openaiSettings[0].setting_value?.api_key;
    
    if (testKey) {
      console.log(`Testing with key: ${testKey.substring(0, 15)}...`);
      
      // Test directly against OpenAI first
      console.log('\nTesting key directly against OpenAI...');
      const directResponse = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${testKey}` }
      });
      
      if (directResponse.ok) {
        console.log('✅ Key works directly against OpenAI');
      } else {
        console.log('❌ Key FAILS directly against OpenAI:', directResponse.status);
        const error = await directResponse.text();
        console.log('Error:', error);
      }
      
      // Now test through Supabase edge function
      console.log('\nTesting through Supabase edge function...');
      const { data: testResult, error: testError } = await supabase.functions.invoke('test-platform-config', {
        body: {
          platform: 'openai',
          type: 'ai_platform',
          api_key: testKey
        }
      });
      
      if (testError) {
        console.log('❌ Edge function error:', testError);
      } else {
        console.log('Edge function result:', JSON.stringify(testResult, null, 2));
      }
    }
  }
  
  // 3. Test content generation
  console.log('\n\n3. Testing content generation...');
  const { data: contentResult, error: contentError } = await supabase.functions.invoke('generate-content', {
    body: {
      contentType: 'social-post',
      strategy: 'Test Strategy',
      platforms: ['twitter'],
      customPrompt: 'Create a test post about AI',
      aiTool: 'gpt-4o-mini',
      organizationId: null
    }
  });
  
  if (contentError) {
    console.log('❌ Content generation error:', contentError);
  } else if (contentResult.error) {
    console.log('❌ Content generation failed:', contentResult.error);
    console.log('Details:', contentResult.details);
  } else {
    console.log('✅ Content generation succeeded!');
  }
  
  // 4. Check what organization the user belongs to (if any)
  console.log('\n\n4. Checking organizations...');
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('*');
  
  if (!orgError && orgs) {
    console.log(`Found ${orgs.length} organizations:`);
    orgs.forEach(org => {
      console.log(`- ${org.name} (ID: ${org.id})`);
    });
  }
  
  console.log('\n=== SUMMARY ===');
  console.log('If OpenAI is still failing:');
  console.log('1. Check that you entered a VALID OpenAI API key');
  console.log('2. Make sure the key has billing/credits enabled');
  console.log('3. Check if the key is organization-specific vs global');
  console.log('4. Try deleting and re-entering the key');
}

debugLiveApp().catch(console.error);