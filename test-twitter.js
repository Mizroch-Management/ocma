// Test script to debug Twitter OAuth 2.0 configuration
import fetch from 'node-fetch';

async function testTwitterConfig() {
  const SUPABASE_URL = 'http://127.0.0.1:54321';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  
  // Test credentials - you would get these from the Settings page
  const testCredentials = {
    bearer_token: 'test_bearer_token', // This would be the actual token from Settings
    api_key: '',
    api_secret: '',
    access_token: '',
    access_token_secret: ''
  };

  try {
    console.log('Testing Twitter configuration...');
    console.log('Credentials being sent:', testCredentials);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/test-platform-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        platform: 'twitter',
        type: 'social_media',
        credentials: testCredentials
      })
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Twitter configuration test passed!');
    } else {
      console.log('❌ Twitter configuration test failed!');
      console.log('Error:', result.message);
      if (result.details) {
        console.log('Details:', result.details);
      }
    }
  } catch (error) {
    console.error('Error testing Twitter config:', error);
  }
}

testTwitterConfig();