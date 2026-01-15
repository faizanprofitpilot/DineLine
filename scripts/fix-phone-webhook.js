/**
 * Fix phone number webhook URL - CRITICAL FIX
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
const WEBHOOK_URL = 'https://www.intakegenie.xyz/api/vapi/webhook';

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

async function fix() {
  console.log('🔧 FIXING PHONE NUMBER WEBHOOK URL...\n');
  console.log(`Phone ID: ${PHONE_ID}`);
  console.log(`Setting webhook to: ${WEBHOOK_URL}\n`);

  try {
    // Update phone number webhook
    const updateRes = await vapiRequest(`/phone-number/${PHONE_ID}`, 'PATCH', {
      server: {
        url: WEBHOOK_URL,
      },
    });

    if (updateRes.status === 200) {
      console.log('✅ Phone number webhook updated successfully!');
      console.log('Response:', JSON.stringify(updateRes.data, null, 2));
      
      // Verify it was updated
      const verifyRes = await vapiRequest(`/phone-number/${PHONE_ID}`);
      if (verifyRes.status === 200) {
        const phone = verifyRes.data;
        console.log('\n✅ Verification:');
        console.log(`   Server URL: ${phone.server?.url}`);
        if (phone.server?.url === WEBHOOK_URL) {
          console.log('   ✅ Webhook URL is correct!');
        } else {
          console.log(`   ❌ Still wrong! Expected: ${WEBHOOK_URL}`);
        }
      }
    } else {
      console.error(`❌ Failed! Status: ${updateRes.status}`);
      console.error('Response:', JSON.stringify(updateRes.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fix().catch(console.error);

