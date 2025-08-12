// Test Twitter/X OAuth 2.0 token directly
import fetch from 'node-fetch';

// REPLACE THIS WITH YOUR ACTUAL BEARER TOKEN
const BEARER_TOKEN = 'YOUR_BEARER_TOKEN_HERE'; // Don't include "Bearer " prefix

async function testTwitterToken() {
  console.log('=== TESTING TWITTER/X OAUTH 2.0 TOKEN ===\n');
  
  if (BEARER_TOKEN === 'YOUR_BEARER_TOKEN_HERE') {
    console.log('❌ Please edit this file and add your actual bearer token first!');
    return;
  }
  
  console.log('Token format check:');
  console.log('  Length:', BEARER_TOKEN.length);
  console.log('  First 10 chars:', BEARER_TOKEN.substring(0, 10) + '...');
  
  // Test 1: Try to get authenticated user info (works with User Context tokens)
  console.log('\n1. Testing user authentication...');
  try {
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });
    
    console.log('  Response status:', userResponse.status);
    const userData = await userResponse.text();
    
    if (userResponse.ok) {
      const user = JSON.parse(userData);
      console.log('  ✅ User authenticated:', user.data?.username);
      console.log('  This is a User Context OAuth 2.0 token');
    } else {
      console.log('  ❌ User endpoint failed:', userData);
      console.log('  This might be an App-Only token');
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
  }
  
  // Test 2: Try to create a tweet (requires User Context with tweet.write scope)
  console.log('\n2. Testing tweet creation (requires tweet.write scope)...');
  try {
    const testTweet = `OCMA test tweet - ${Date.now()}`;
    const createResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: testTweet })
    });
    
    console.log('  Response status:', createResponse.status);
    const createData = await createResponse.text();
    
    if (createResponse.ok) {
      const tweet = JSON.parse(createData);
      console.log('  ✅ Tweet created successfully! ID:', tweet.data?.id);
      console.log('  Token has tweet.write scope');
      
      // Try to delete the test tweet
      if (tweet.data?.id) {
        console.log('  Deleting test tweet...');
        const deleteResponse = await fetch(`https://api.twitter.com/2/tweets/${tweet.data.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${BEARER_TOKEN}`
          }
        });
        if (deleteResponse.ok) {
          console.log('  ✅ Test tweet deleted');
        }
      }
    } else if (createResponse.status === 403) {
      console.log('  ❌ 403 Forbidden - Token lacks tweet.write scope');
      console.log('  Response:', createData);
      console.log('\n  SOLUTION: You need to re-authenticate with tweet.write scope');
    } else if (createResponse.status === 401) {
      console.log('  ❌ 401 Unauthorized - Token is invalid or expired');
      console.log('  Response:', createData);
      console.log('\n  SOLUTION: Generate a new OAuth 2.0 token');
    } else {
      console.log('  ❌ Failed with status:', createResponse.status);
      console.log('  Response:', createData);
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
  }
  
  // Test 3: Try a simple read operation (works with most tokens)
  console.log('\n3. Testing basic read access...');
  try {
    const searchResponse = await fetch('https://api.twitter.com/2/tweets/search/recent?query=openai', {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });
    
    console.log('  Response status:', searchResponse.status);
    
    if (searchResponse.ok) {
      console.log('  ✅ Read access works');
    } else {
      const errorData = await searchResponse.text();
      console.log('  ❌ Read access failed:', errorData);
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
  }
  
  console.log('\n=== SUMMARY ===');
  console.log('Key requirements for OCMA:');
  console.log('1. Must be OAuth 2.0 User Context token (not App-Only)');
  console.log('2. Must have tweet.write scope');
  console.log('3. Token must not be expired');
  console.log('\nTo get a proper token:');
  console.log('1. Go to Twitter Developer Portal');
  console.log('2. Use OAuth 2.0 User authentication');
  console.log('3. Include scopes: tweet.read, tweet.write, users.read');
}

testTwitterToken().catch(console.error);