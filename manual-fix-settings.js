// Manual fix to directly save settings to database
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6InNlcnZpY2VfX...'; // You need the service key for this

// Use the anon key for now - service operations may be limited
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuration - REPLACE THESE WITH YOUR ACTUAL VALUES
const CONFIG = {
  openai_api_key: 'sk-...', // Replace with your actual OpenAI API key
  twitter_bearer_token: 'Bearer ...', // Replace with your actual Twitter OAuth 2.0 bearer token
  organization_name: 'eth 3' // The organization you created
};

async function manualFixSettings() {
  console.log('=== MANUAL SETTINGS FIX ===\n');
  
  // 1. Find the organization
  console.log('1. Looking for organization:', CONFIG.organization_name);
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('name', CONFIG.organization_name);
  
  if (orgError) {
    console.error('❌ Error finding organization:', orgError.message);
    return;
  }
  
  if (!orgs || orgs.length === 0) {
    console.log('❌ Organization not found. Creating it now...');
    
    // Create the organization
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert({
        name: CONFIG.organization_name,
        description: 'Created by manual fix script',
        status: 'active'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create organization:', createError.message);
      return;
    }
    
    console.log('✅ Created organization:', newOrg.name, '(ID:', newOrg.id, ')');
    orgs[0] = newOrg;
  } else {
    console.log('✅ Found organization:', orgs[0].name, '(ID:', orgs[0].id, ')');
  }
  
  const orgId = orgs[0].id;
  
  // 2. Save OpenAI API key
  if (CONFIG.openai_api_key && CONFIG.openai_api_key !== 'sk-...') {
    console.log('\n2. Saving OpenAI API key...');
    
    // Check if setting exists
    const { data: existing } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', 'openai_api_key')
      .eq('organization_id', orgId)
      .single();
    
    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: { api_key: CONFIG.openai_api_key }
        })
        .eq('id', existing.id);
      
      if (error) {
        console.error('❌ Failed to update OpenAI key:', error.message);
      } else {
        console.log('✅ Updated OpenAI API key');
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('system_settings')
        .insert({
          setting_key: 'openai_api_key',
          setting_value: { api_key: CONFIG.openai_api_key },
          organization_id: orgId,
          category: 'ai_platforms',
          description: 'OpenAI API key'
        });
      
      if (error) {
        console.error('❌ Failed to save OpenAI key:', error.message);
      } else {
        console.log('✅ Saved OpenAI API key');
      }
    }
  } else {
    console.log('\n2. Skipping OpenAI - no key provided');
  }
  
  // 3. Save Twitter configuration
  if (CONFIG.twitter_bearer_token && CONFIG.twitter_bearer_token !== 'Bearer ...') {
    console.log('\n3. Saving Twitter configuration...');
    
    const bearerToken = CONFIG.twitter_bearer_token.replace('Bearer ', '');
    
    // Check if setting exists
    const { data: existing } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', 'twitter_integration')
      .eq('organization_id', orgId)
      .single();
    
    const twitterConfig = {
      connected: true,
      credentials: {
        bearer_token: bearerToken,
        api_key: '',
        api_secret: '',
        access_token: '',
        access_token_secret: ''
      },
      last_sync: new Date().toISOString()
    };
    
    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: twitterConfig
        })
        .eq('id', existing.id);
      
      if (error) {
        console.error('❌ Failed to update Twitter config:', error.message);
      } else {
        console.log('✅ Updated Twitter configuration');
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('system_settings')
        .insert({
          setting_key: 'twitter_integration',
          setting_value: twitterConfig,
          organization_id: orgId,
          category: 'integration',
          description: 'Twitter platform integration'
        });
      
      if (error) {
        console.error('❌ Failed to save Twitter config:', error.message);
      } else {
        console.log('✅ Saved Twitter configuration');
      }
    }
  } else {
    console.log('\n3. Skipping Twitter - no bearer token provided');
  }
  
  // 4. Verify the settings were saved
  console.log('\n4. Verifying saved settings...');
  const { data: allSettings } = await supabase
    .from('system_settings')
    .select('*')
    .eq('organization_id', orgId);
  
  console.log(`\n✅ Total settings for organization: ${allSettings?.length || 0}`);
  allSettings?.forEach(s => {
    if (s.setting_key === 'openai_api_key') {
      console.log(`  - OpenAI: ${s.setting_value?.api_key ? 'Configured' : 'Missing'}`);
    } else if (s.setting_key === 'twitter_integration') {
      console.log(`  - Twitter: ${s.setting_value?.connected ? 'Connected' : 'Not connected'}`);
    }
  });
  
  console.log('\n=== NEXT STEPS ===');
  console.log('1. Refresh the OCMA app in your browser');
  console.log('2. Make sure you are logged in');
  console.log('3. Select the organization "' + CONFIG.organization_name + '"');
  console.log('4. Go to Settings page - your API keys should now be there');
  console.log('5. Test the configurations');
}

// Instructions
console.log('=== INSTRUCTIONS ===');
console.log('1. Edit this file and replace the CONFIG values with your actual keys:');
console.log('   - openai_api_key: Your OpenAI API key (starts with sk-)');
console.log('   - twitter_bearer_token: Your Twitter OAuth 2.0 bearer token');
console.log('   - organization_name: The name of your organization (default: eth 3)');
console.log('2. Save the file');
console.log('3. Run: node manual-fix-settings.js');
console.log('');

// Only run if configuration is provided
if (CONFIG.openai_api_key === 'sk-...' && CONFIG.twitter_bearer_token === 'Bearer ...') {
  console.log('⚠️  Please edit the CONFIG object first with your actual values!');
} else {
  manualFixSettings().catch(console.error);
}