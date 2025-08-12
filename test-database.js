// Check what's stored in the database
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDatabase() {
  console.log('=== Checking Database Settings ===\n');
  
  // Get all system settings
  const { data: settings, error } = await supabase
    .from('system_settings')
    .select('*')
    .in('setting_key', ['openai_api_key', 'twitter_integration', 'anthropic_api_key']);
  
  if (error) {
    console.error('Error fetching settings:', error);
    return;
  }
  
  console.log('Found settings:', settings?.length || 0);
  
  if (settings && settings.length > 0) {
    settings.forEach(setting => {
      console.log('\n---');
      console.log('Setting Key:', setting.setting_key);
      console.log('Organization ID:', setting.organization_id || 'NULL (global)');
      
      if (setting.setting_key === 'openai_api_key') {
        const value = setting.setting_value;
        if (value?.api_key) {
          console.log('OpenAI Key stored:', `${value.api_key.substring(0, 10)}...`);
        } else {
          console.log('OpenAI Key: NOT SET');
        }
      } else if (setting.setting_key === 'twitter_integration') {
        const value = setting.setting_value;
        console.log('Twitter connected:', value?.connected || false);
        if (value?.credentials) {
          console.log('Bearer token:', value.credentials.bearer_token ? 'SET' : 'NOT SET');
          console.log('API key:', value.credentials.api_key ? 'SET' : 'NOT SET');
          console.log('Access token:', value.credentials.access_token ? 'SET' : 'NOT SET');
        }
      }
    });
  } else {
    console.log('No settings found in database');
  }
  
  // Check for any organizations
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(5);
  
  if (!orgError && orgs) {
    console.log('\n\n=== Organizations ===');
    orgs.forEach(org => {
      console.log(`- ${org.name} (ID: ${org.id})`);
    });
  }
}

checkDatabase().catch(console.error);