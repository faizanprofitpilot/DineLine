/**
 * Check phone number status and recent calls
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env.local
try {
  const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
} catch (e) {}

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const PHONE_ID = '33fabbe5-b2c6-4c08-80b9-1bb99bfc62a6';

function vapiRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vapi.ai',
      port: 443,
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function check() {
  console.log('📞 Checking Phone Number Status...\n');
  
  // Check phone number
  try {
    const phoneRes = await vapiRequest(`/phone-number/${PHONE_ID}`);
    if (phoneRes.status === 200) {
      const phone = phoneRes.data;
      console.log('Phone Number Details:');
      console.log(JSON.stringify(phone, null, 2));
      console.log('\n✅ Phone number is configured');
      console.log(`   Number: ${phone.number || 'Pending'}`);
      console.log(`   Assistant: ${phone.assistantId || 'NOT SET'}`);
      console.log(`   Server URL: ${phone.server?.url || 'NOT SET'}`);
    }
  } catch (error) {
    console.error('❌ Error checking phone:', error.message);
  }

  // Check recent calls
  console.log('\n📞 Checking Recent Calls...\n');
  try {
    const callsRes = await vapiRequest('/call?limit=5');
    if (callsRes.status === 200 && Array.isArray(callsRes.data)) {
      console.log(`Found ${callsRes.data.length} recent calls:`);
      callsRes.data.forEach((call, i) => {
        console.log(`\nCall ${i + 1}:`);
        console.log(`   ID: ${call.id}`);
        console.log(`   Status: ${call.status}`);
        console.log(`   Phone Number ID: ${call.phoneNumberId}`);
        console.log(`   Assistant ID: ${call.assistantId}`);
        console.log(`   Created: ${call.createdAt}`);
        if (call.endedAt) {
          console.log(`   Ended: ${call.endedAt}`);
        }
        if (call.error) {
          console.log(`   ❌ Error: ${call.error}`);
        }
      });
    } else {
      console.log('No calls found or unexpected response');
      console.log(JSON.stringify(callsRes.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error checking calls:', error.message);
  }
}

check().catch(console.error);

