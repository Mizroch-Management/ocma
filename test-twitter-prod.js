// Test script to debug Twitter OAuth 2.0 configuration against production
import fetch from 'node-fetch';

async function testTwitterConfig() {
  const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';
  
  // Test credentials - simulate what the Settings page sends
  const testCredentials = {
    bearer_token: 'test_bearer_token', // This would be the actual token from Settings
    api_key: '',
    api_secret: '',
    access_token: '',
    access_token_secret: ''
  };

  try {
    console.log('Testing Twitter configuration against PRODUCTION...');
    console.log('URL:', `${SUPABASE_URL}/functions/v1/test-platform-config`);
    console.log('Credentials being sent:', JSON.stringify(testCredentials, null, 2));
    
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

    console.log('Response status:', response.status);
    const result = await response.json();
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

// Also test content generation
async function testContentGeneration() {
  const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';
  
  try {
    console.log('\n\nTesting Content Generation...');
    console.log('URL:', `${SUPABASE_URL}/functions/v1/generate-content`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        contentType: 'social-post',
        strategy: 'Test Strategy',
        platforms: ['twitter'],
        customPrompt: 'Create a test post about AI',
        aiTool: 'gpt-4o-mini',
        organizationId: null
      })
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    
    if (result.error) {
      console.log('❌ Content generation failed!');
      console.log('Error:', result.error);
      console.log('Details:', result.details);
    } else {
      console.log('✅ Content generation succeeded!');
      console.log('Title:', result.title);
      console.log('Content preview:', result.content?.substring(0, 100) + '...');
    }
  } catch (error) {
    console.error('Error testing content generation:', error);
  }
}

async function runTests() {
  await testTwitterConfig();
  await testContentGeneration();
}

runTests();