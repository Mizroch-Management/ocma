// Comprehensive test script for OpenAI and Twitter configurations
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://wxxjbkqnvpbjywejfrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4';

// Test OpenAI API key directly
async function testOpenAIDirectly(apiKey) {
  console.log('\n=== Testing OpenAI API Key Directly ===');
  console.log('API Key format:', apiKey ? `sk-...${apiKey.slice(-4)}` : 'MISSING');
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    console.log('OpenAI API Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ OpenAI API Key is VALID');
      console.log('Available models:', data.data.length);
      return true;
    } else {
      const error = await response.text();
      console.log('❌ OpenAI API Key is INVALID');
      console.log('Error:', error);
      return false;
    }
  } catch (error) {
    console.error('Failed to test OpenAI:', error.message);
    return false;
  }
}

// Test Twitter bearer token directly
async function testTwitterDirectly(bearerToken) {
  console.log('\n=== Testing Twitter Bearer Token Directly ===');
  console.log('Token format:', bearerToken ? `${bearerToken.slice(0, 10)}...` : 'MISSING');
  
  try {
    // First, try to get user info (this will tell us if it's app-only or user context)
    const meResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
    });
    
    console.log('Twitter /users/me Response Status:', meResponse.status);
    
    if (meResponse.ok) {
      const userData = await meResponse.json();
      console.log('✅ This is a User Context token');
      console.log('User:', userData.data?.username);
      
      // Now test tweet creation
      console.log('\nTesting tweet creation...');
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: `OCMA test tweet ${Date.now()}`
        })
      });
      
      console.log('Tweet creation status:', tweetResponse.status);
      const tweetResult = await tweetResponse.json();
      
      if (tweetResponse.ok) {
        console.log('✅ Can create tweets! Tweet ID:', tweetResult.data?.id);
        
        // Delete the test tweet
        if (tweetResult.data?.id) {
          await fetch(`https://api.twitter.com/2/tweets/${tweetResult.data.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${bearerToken}` }
          });
          console.log('Test tweet deleted');
        }
        return true;
      } else {
        console.log('❌ Cannot create tweets:', tweetResult);
        return false;
      }
    } else {
      const error = await meResponse.json();
      if (meResponse.status === 403) {
        console.log('⚠️  This appears to be an App-Only token (cannot access user context)');
      } else {
        console.log('❌ Token is invalid or expired');
      }
      console.log('Error:', error);
      return false;
    }
  } catch (error) {
    console.error('Failed to test Twitter:', error.message);
    return false;
  }
}

// Test through Supabase Edge Function
async function testThroughSupabase(platform, type, testData) {
  console.log(`\n=== Testing ${platform} through Supabase Edge Function ===`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/test-platform-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        platform,
        type,
        ...testData
      })
    });
    
    console.log('Supabase Response Status:', response.status);
    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ ${platform} configuration test PASSED through Supabase`);
    } else {
      console.log(`❌ ${platform} configuration test FAILED through Supabase`);
    }
    
    return result;
  } catch (error) {
    console.error(`Failed to test ${platform} through Supabase:`, error.message);
    return { success: false, error: error.message };
  }
}

// Test content generation
async function testContentGeneration(organizationId) {
  console.log('\n=== Testing Content Generation ===');
  console.log('Organization ID:', organizationId || 'null');
  
  try {
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
        customPrompt: 'Create a test post about AI technology',
        aiTool: 'gpt-4o-mini',
        organizationId: organizationId
      })
    });
    
    console.log('Response Status:', response.status);
    const result = await response.json();
    
    if (result.error) {
      console.log('❌ Content generation FAILED');
      console.log('Error:', result.error);
      console.log('Details:', result.details);
    } else {
      console.log('✅ Content generation SUCCEEDED');
      console.log('Generated title:', result.title);
    }
    
    return result;
  } catch (error) {
    console.error('Failed to test content generation:', error.message);
    return { error: error.message };
  }
}

// Main test function
async function runAllTests() {
  // Get test credentials from command line or use test values
  const openaiKey = process.argv[2] || process.env.OPENAI_API_KEY;
  const twitterToken = process.argv[3] || process.env.TWITTER_BEARER_TOKEN;
  const organizationId = process.argv[4];
  
  console.log('='.repeat(60));
  console.log('COMPREHENSIVE CONFIGURATION TEST');
  console.log('='.repeat(60));
  
  if (!openaiKey) {
    console.log('\n⚠️  No OpenAI API key provided');
    console.log('Usage: node test-all-configs.js <openai_key> <twitter_token> [organization_id]');
  } else {
    // Test OpenAI directly
    const openaiValid = await testOpenAIDirectly(openaiKey);
    
    // Test OpenAI through Supabase
    await testThroughSupabase('openai', 'ai_platform', {
      api_key: openaiKey
    });
  }
  
  if (!twitterToken) {
    console.log('\n⚠️  No Twitter token provided');
  } else {
    // Test Twitter directly
    const twitterValid = await testTwitterDirectly(twitterToken);
    
    // Test Twitter through Supabase
    await testThroughSupabase('twitter', 'social_media', {
      credentials: {
        bearer_token: twitterToken,
        api_key: '',
        api_secret: '',
        access_token: '',
        access_token_secret: ''
      }
    });
  }
  
  // Test content generation
  await testContentGeneration(organizationId);
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
}

// Run tests
runAllTests().catch(console.error);