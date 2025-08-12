// Test the current settings that are already in the database
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testCurrentSettings() {
  console.log('=== Testing Current Settings in Database ===\n');
  
  // Get the settings
  const { data: settings, error } = await supabase
    .from('system_settings')
    .select('*')
    .in('setting_key', ['openai_api_key', 'twitter_integration']);
  
  if (error || !settings) {
    console.error('Failed to fetch settings:', error);
    return;
  }
  
  // Test OpenAI key
  const openaiSetting = settings.find(s => s.setting_key === 'openai_api_key');
  if (openaiSetting) {
    const apiKey = openaiSetting.setting_value?.api_key;
    console.log('OpenAI API Key found:', apiKey ? `${apiKey.substring(0, 15)}...` : 'MISSING');
    
    if (apiKey) {
      console.log('Testing OpenAI API key...');
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (response.ok) {
        console.log('✅ OpenAI API key is VALID and working!');
      } else {
        console.log('❌ OpenAI API key is INVALID:', response.status);
      }
    }
  } else {
    console.log('❌ No OpenAI API key found in settings');
  }
  
  console.log();
  
  // Test Twitter configuration
  const twitterSetting = settings.find(s => s.setting_key === 'twitter_integration');
  if (twitterSetting) {
    const credentials = twitterSetting.setting_value?.credentials;
    const bearerToken = credentials?.bearer_token;
    
    console.log('Twitter Bearer Token found:', bearerToken ? `${bearerToken.substring(0, 10)}...` : 'MISSING');
    
    if (bearerToken) {
      console.log('Testing Twitter token...');
      
      // Test if it's user context
      const meResponse = await fetch('https://api.twitter.com/2/users/me', {
        headers: { 'Authorization': `Bearer ${bearerToken}` }
      });
      
      if (meResponse.ok) {
        const userData = await meResponse.json();
        console.log('✅ Twitter token is User Context! User:', userData.data?.username);
        
        // Test tweet capability
        const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: `OCMA test ${Date.now()}` })
        });
        
        if (tweetResponse.ok) {
          const tweet = await tweetResponse.json();
          console.log('✅ Can post tweets! Test tweet ID:', tweet.data?.id);
          
          // Delete test tweet
          await fetch(`https://api.twitter.com/2/tweets/${tweet.data.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${bearerToken}` }
          });
          console.log('Test tweet deleted');
        } else {
          console.log('❌ Cannot post tweets');
        }
      } else if (meResponse.status === 403) {
        console.log('❌ Twitter token is App-Only (cannot post tweets)');
        console.log('You need a User Context OAuth 2.0 token');
      } else {
        console.log('❌ Twitter token is invalid');
      }
    }
  } else {
    console.log('❌ No Twitter configuration found in settings');
  }
  
  console.log('\n=== Test Complete ===');
  console.log('Now try:');
  console.log('1. Go to the OCMA app');
  console.log('2. Try generating content');
  console.log('3. Try the Twitter test in Settings');
}

testCurrentSettings().catch(console.error);