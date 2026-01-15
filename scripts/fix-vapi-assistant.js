/**
 * Fix Vapi assistant and phone number configuration
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
const FIRM_ID = '591329c4-0dc9-4164-955e-79a273e550d0';
const PHONE_NUMBER = '+16592157925';
const WEBHOOK_URL = 'https://www.intakegenie.xyz/api/vapi/webhook';
const ASSISTANT_ID = '3946e037-e23e-4ff6-9da2-608771d468b3'; // The one linked to your phone

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

async function fixAssistant() {
  console.log('🔧 Fixing Vapi Assistant Configuration...\n');
  
  console.log(`Assistant ID: ${ASSISTANT_ID}`);
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Firm ID: ${FIRM_ID}\n`);

  // Update assistant
  console.log('1. Updating assistant webhook and metadata...');
  try {
    const updateRes = await vapiRequest(`/assistant/${ASSISTANT_ID}`, 'PATCH', {
      server: {
        url: WEBHOOK_URL,
      },
      metadata: {
        firmId: FIRM_ID,
      },
    });

    if (updateRes.status === 200) {
      console.log('   ✅ Assistant updated successfully!');
      console.log('   Response:', JSON.stringify(updateRes.data, null, 2));
    } else {
      console.log(`   ⚠️  Status: ${updateRes.status}`);
      console.log('   Response:', JSON.stringify(updateRes.data, null, 2));
    }
  } catch (error) {
    console.error('   ❌ Error updating assistant:', error.message);
  }

  // Update phone number
  console.log('\n2. Updating phone number webhook...');
  try {
    const phoneId = '33fabbe5-b2c6-4c08-80b9-1bb99bfc62a6'; // From the check script
    const updatePhoneRes = await vapiRequest(`/phone-number/${phoneId}`, 'PATCH', {
      server: {
        url: WEBHOOK_URL,
      },
    });

    if (updatePhoneRes.status === 200) {
      console.log('   ✅ Phone number updated successfully!');
    } else {
      console.log(`   ⚠️  Status: ${updatePhoneRes.status}`);
      console.log('   Response:', JSON.stringify(updatePhoneRes.data, null, 2));
    }
  } catch (error) {
    console.error('   ❌ Error updating phone number:', error.message);
  }

  console.log('\n✅ Configuration update complete!');
  console.log('Now try calling your number again.');
}

fixAssistant().catch(console.error);

