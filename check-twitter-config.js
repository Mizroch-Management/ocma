// Check exactly what Twitter configuration is saved
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTwitterConfig() {
  console.log('=== CHECKING TWITTER CONFIGURATION IN DATABASE ===\n');
  
  // 1. Get all Twitter settings
  const { data: settings, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('setting_key', 'twitter_integration');
  
  if (error) {
    console.error('Error fetching settings:', error);
    return;
  }
  
  if (!settings || settings.length === 0) {
    console.log('❌ No Twitter settings found in database');
    return;
  }
  
  console.log(`Found ${settings.length} Twitter configuration(s):\n`);
  
  for (const setting of settings) {
    console.log('Organization ID:', setting.organization_id || 'global');
    console.log('Setting value:', JSON.stringify(setting.setting_value, null, 2));
    
    const config = setting.setting_value;
    if (!config) continue;
    
    console.log('\nCredentials found:');
    const creds = config.credentials || {};
    
    // Check each credential field
    if (creds.bearer_token) {
      console.log('✅ bearer_token:', creds.bearer_token.substring(0, 20) + '...');
      console.log('   Length:', creds.bearer_token.length);
      console.log('   Starts with "Bearer "?:', creds.bearer_token.startsWith('Bearer '));
      
      // Test the token directly
      console.log('\n   Testing this token...');
      await testToken(creds.bearer_token);
    } else {
      console.log('❌ bearer_token: NOT SET');
    }
    
    if (creds.access_token) {
      console.log('✅ access_token:', creds.access_token.substring(0, 20) + '...');
    }
    
    if (creds.api_key) {
      console.log('✅ api_key:', creds.api_key.substring(0, 20) + '...');
    }
    
    console.log('\n' + '='.repeat(50));
  }
  
  // 2. Test via edge function
  console.log('\n2. Testing via Supabase Edge Function...');
  
  const testSetting = settings[0];
  if (testSetting && testSetting.setting_value?.credentials) {
    const { data: testResult, error: testError } = await supabase.functions.invoke('test-platform-config', {
      body: {
        platform: 'twitter',
        type: 'social_media',
        credentials: testSetting.setting_value.credentials
      }
    });
    
    if (testError) {
      console.log('❌ Edge function error:', testError.message);
    } else {
      console.log('Edge function response:', JSON.stringify(testResult, null, 2));
    }
  }
}

async function testToken(token) {
  // Remove "Bearer " if it's included
  const cleanToken = token.replace(/^Bearer\s+/i, '');
  
  try {
    // Test 1: User info
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: { 'Authorization': `Bearer ${cleanToken}` }
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('   ✅ Token is valid! User:', userData.data?.username);
    } else {
      console.log('   ❌ User check failed:', userResponse.status);
      const error = await userResponse.text();
      console.log('   Error:', error);
    }
    
    // Test 2: Tweet creation capability
    const testTweet = `OCMA test ${Date.now()}`;
    const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: testTweet })
    });
    
    if (tweetResponse.ok) {
      const tweetData = await tweetResponse.json();
      console.log('   ✅ Can create tweets! Test tweet ID:', tweetData.data?.id);
      
      // Delete test tweet
      if (tweetData.data?.id) {
        await fetch(`https://api.twitter.com/2/tweets/${tweetData.data.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${cleanToken}` }
        });
        console.log('   ✅ Test tweet deleted');
      }
    } else {
      console.log('   ❌ Tweet creation failed:', tweetResponse.status);
      const error = await tweetResponse.text();
      console.log('   Error:', error);
      
      if (tweetResponse.status === 403) {
        console.log('   💡 Solution: Token lacks tweet.write scope - need new token with proper scopes');
      } else if (tweetResponse.status === 401) {
        console.log('   💡 Solution: Token is invalid or expired - generate new token');
      }
    }
  } catch (error) {
    console.log('   ❌ Network error:', error.message);
  }
}

checkTwitterConfig().catch(console.error);