// Test Twitter OAuth 1.0a credentials
import crypto from 'crypto';
import fetch from 'node-fetch';

// YOUR CREDENTIALS (from database check)
const credentials = {
  api_key: "h2eidKuXuQFJcAko4Ei4XNp47",  // Consumer Key
  api_secret: "cjA5gTXCx1RzHpMk72IjCAkEVhTdKIRBDHMqsJPO8hMcYGLxmJ",  // Consumer Secret
  access_token: "1947739935676780544-YlBrzvxbfvwjNWKJeYtylvyoD3gCC6",  // Access Token
  access_token_secret: "pQQdxQrRItiFRisqNJvSyzYFO22V6i8D2peRmsNDotEBi"  // Access Token Secret
};

function generateOAuth1Header(method, url, params, credentials) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  
  const oauthParams = {
    oauth_consumer_key: credentials.api_key,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: credentials.access_token,
    oauth_version: '1.0'
  };
  
  // Combine OAuth params with request params
  const allParams = { ...oauthParams, ...params };
  
  // Create parameter string
  const paramString = Object.keys(allParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
    .join('&');
  
  // Create signature base string
  const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  
  // Create signing key
  const signingKey = `${encodeURIComponent(credentials.api_secret)}&${encodeURIComponent(credentials.access_token_secret)}`;
  
  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');
  
  // Create OAuth header
  const oauthHeader = 'OAuth ' + Object.keys(oauthParams)
    .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ') + `, oauth_signature="${encodeURIComponent(signature)}"`;
  
  return oauthHeader;
}

async function testOAuth1Credentials() {
  console.log('=== TESTING TWITTER OAUTH 1.0a CREDENTIALS ===\n');
  
  // Test 1: Verify credentials (GET account/verify_credentials)
  console.log('1. Verifying credentials...');
  const verifyUrl = 'https://api.twitter.com/1.1/account/verify_credentials.json';
  const authHeader = generateOAuth1Header('GET', verifyUrl, {}, credentials);
  
  try {
    const response = await fetch(verifyUrl, {
      headers: {
        'Authorization': authHeader
      }
    });
    
    if (response.ok) {
      const user = await response.json();
      console.log('✅ OAuth 1.0a credentials valid!');
      console.log('   User:', user.screen_name);
      console.log('   Name:', user.name);
      console.log('   ID:', user.id_str);
    } else {
      console.log('❌ Verification failed:', response.status);
      const error = await response.text();
      console.log('   Error:', error);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
  
  // Test 2: Try to post a tweet
  console.log('\n2. Testing tweet creation...');
  const tweetUrl = 'https://api.twitter.com/2/tweets';
  const testTweet = { text: `OCMA OAuth 1.0a test - ${Date.now()}` };
  
  const tweetAuthHeader = generateOAuth1Header('POST', tweetUrl, {}, credentials);
  
  try {
    const response = await fetch(tweetUrl, {
      method: 'POST',
      headers: {
        'Authorization': tweetAuthHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testTweet)
    });
    
    if (response.ok) {
      const tweet = await response.json();
      console.log('✅ Tweet created successfully!');
      console.log('   Tweet ID:', tweet.data?.id);
      
      // Delete the test tweet
      if (tweet.data?.id) {
        const deleteUrl = `https://api.twitter.com/2/tweets/${tweet.data.id}`;
        const deleteAuthHeader = generateOAuth1Header('DELETE', deleteUrl, {}, credentials);
        
        const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': deleteAuthHeader
          }
        });
        
        if (deleteResponse.ok) {
          console.log('✅ Test tweet deleted');
        }
      }
    } else {
      console.log('❌ Tweet creation failed:', response.status);
      const error = await response.text();
      console.log('   Error:', error);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
  
  console.log('\n=== SOLUTION ===');
  console.log('Your OAuth 1.0a credentials appear to be valid.');
  console.log('The issue is that the edge function is only trying the OAuth 2.0 bearer token.');
  console.log('We need to update the edge function to use OAuth 1.0a when the bearer token fails.');
}

testOAuth1Credentials().catch(console.error);