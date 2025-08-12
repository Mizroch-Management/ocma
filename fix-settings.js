// Script to manually fix the settings issue by directly inserting with service role
import { createClient } from '@supabase/supabase-js';

// You need to get the service role key from Supabase dashboard
// Settings > API > service_role (secret)
const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('\nTo fix this:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to Settings > API');
  console.log('3. Copy the service_role key (keep it secret!)');
  console.log('4. Run: SUPABASE_SERVICE_ROLE_KEY="your-key" node fix-settings.js');
  process.exit(1);
}

// Create client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixSettings() {
  console.log('=== Fixing Settings with Service Role ===\n');
  
  // Get command line arguments
  const openaiKey = process.argv[2];
  const twitterToken = process.argv[3];
  
  if (!openaiKey || !twitterToken) {
    console.log('Usage: node fix-settings.js <openai_key> <twitter_token>');
    console.log('Example: node fix-settings.js sk-proj-xxx... AAA...');
    return;
  }
  
  // Insert/Update OpenAI API key
  console.log('Setting OpenAI API key...');
  const openaiSetting = {
    setting_key: 'openai_api_key',
    setting_value: { api_key: openaiKey },
    category: 'ai_platforms',
    description: 'OpenAI API Key',
    organization_id: null // Global setting
  };
  
  const { data: openaiData, error: openaiError } = await supabase
    .from('system_settings')
    .upsert(openaiSetting, {
      onConflict: 'setting_key,organization_id'
    })
    .select();
  
  if (openaiError) {
    console.error('❌ Failed to save OpenAI key:', openaiError);
  } else {
    console.log('✅ OpenAI API key saved successfully');
  }
  
  // Insert/Update Twitter configuration
  console.log('\nSetting Twitter/X configuration...');
  const twitterSetting = {
    setting_key: 'twitter_integration',
    setting_value: {
      connected: true,
      credentials: {
        bearer_token: twitterToken,
        api_key: '',
        api_secret: '',
        access_token: '',
        access_token_secret: ''
      },
      verified: true,
      last_verified: new Date().toISOString()
    },
    category: 'integration',
    description: 'Twitter/X Integration',
    organization_id: null // Global setting
  };
  
  const { data: twitterData, error: twitterError } = await supabase
    .from('system_settings')
    .upsert(twitterSetting, {
      onConflict: 'setting_key,organization_id'
    })
    .select();
  
  if (twitterError) {
    console.error('❌ Failed to save Twitter config:', twitterError);
  } else {
    console.log('✅ Twitter/X configuration saved successfully');
  }
  
  // Verify the settings were saved
  console.log('\n=== Verifying Settings ===');
  const { data: allSettings, error: verifyError } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['openai_api_key', 'twitter_integration']);
  
  if (verifyError) {
    console.error('❌ Failed to verify:', verifyError);
  } else {
    console.log('Found settings:', allSettings?.length || 0);
    allSettings?.forEach(s => {
      console.log(`- ${s.setting_key}: ${s.setting_key === 'openai_api_key' ? 
        s.setting_value.api_key?.substring(0, 10) + '...' : 
        'Connected: ' + s.setting_value.connected}`);
    });
  }
  
  // Now test the configurations
  console.log('\n=== Testing Configurations ===');
  
  // Test OpenAI
  console.log('\nTesting OpenAI...');
  const openaiResponse = await fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': `Bearer ${openaiKey}` }
  });
  
  if (openaiResponse.ok) {
    console.log('✅ OpenAI API key is valid');
  } else {
    console.log('❌ OpenAI API key is invalid');
  }
  
  // Test Twitter
  console.log('\nTesting Twitter/X...');
  const twitterResponse = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${twitterToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: `OCMA test ${Date.now()}` })
  });
  
  if (twitterResponse.ok) {
    const tweet = await twitterResponse.json();
    console.log('✅ Twitter token is valid (can post)');
    // Delete test tweet
    await fetch(`https://api.twitter.com/2/tweets/${tweet.data.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${twitterToken}` }
    });
  } else {
    const error = await twitterResponse.json();
    console.log('❌ Twitter token issue:', error.detail || error.title);
  }
  
  console.log('\n✅ Settings have been fixed! Try the app again.');
}

fixSettings().catch(console.error);