/**
 * Check Vapi configuration to diagnose why calls aren't going through
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Try to load .env.local manually
try {
  const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
} catch (e) {
  // .env.local might not exist, that's okay
}

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const FIRM_ID = '591329c4-0dc9-4164-955e-79a273e550d0';
const WEBHOOK_URL = 'https://www.intakegenie.xyz/api/vapi/webhook';

if (!VAPI_API_KEY) {
  console.error('❌ VAPI_API_KEY not found in .env.local');
  process.exit(1);
}

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

async function checkConfiguration() {
  console.log('🔍 Checking Vapi Configuration...\n');
  console.log(`Webhook URL: ${WEBHOOK_URL}\n`);

  // Check assistants
  console.log('1. Checking assistants...');
  try {
    const assistantsRes = await vapiRequest('/assistant');
    if (assistantsRes.status === 200 && Array.isArray(assistantsRes.data)) {
      console.log(`   ✅ Found ${assistantsRes.data.length} assistant(s)`);
      assistantsRes.data.forEach((assistant, i) => {
        console.log(`   Assistant ${i + 1}:`);
        console.log(`      ID: ${assistant.id}`);
        console.log(`      Name: ${assistant.name}`);
        console.log(`      Server URL: ${assistant.server?.url || 'NOT SET'}`);
        console.log(`      Metadata: ${JSON.stringify(assistant.metadata || {})}`);
        if (assistant.server?.url !== WEBHOOK_URL) {
          console.log(`      ⚠️  Webhook URL mismatch! Expected: ${WEBHOOK_URL}`);
        }
        if (assistant.metadata?.firmId !== FIRM_ID) {
          console.log(`      ⚠️  Firm ID mismatch! Expected: ${FIRM_ID}`);
        }
      });
    } else {
      console.log('   ⚠️  Unexpected response format');
      console.log('   Response:', JSON.stringify(assistantsRes.data, null, 2));
    }
  } catch (error) {
    console.error('   ❌ Error fetching assistants:', error.message);
  }

  console.log('\n2. Checking phone numbers...');
  try {
    const phonesRes = await vapiRequest('/phone-number');
    if (phonesRes.status === 200 && Array.isArray(phonesRes.data)) {
      console.log(`   ✅ Found ${phonesRes.data.length} phone number(s)`);
      phonesRes.data.forEach((phone, i) => {
        console.log(`   Phone ${i + 1}:`);
        console.log(`      ID: ${phone.id}`);
        console.log(`      Number: ${phone.number || 'Pending assignment'}`);
        console.log(`      Assistant ID: ${phone.assistantId || 'NOT ASSIGNED'}`);
        console.log(`      Server URL: ${phone.server?.url || 'NOT SET'}`);
        if (!phone.assistantId) {
          console.log(`      ⚠️  No assistant assigned!`);
        }
        if (phone.server?.url && phone.server.url !== WEBHOOK_URL) {
          console.log(`      ⚠️  Webhook URL mismatch!`);
        }
      });
    } else {
      console.log('   ⚠️  Unexpected response format');
      console.log('   Response:', JSON.stringify(phonesRes.data, null, 2));
    }
  } catch (error) {
    console.error('   ❌ Error fetching phone numbers:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('1. Check if assistant has webhook URL set correctly');
  console.log('2. Check if phone number has assistant assigned');
  console.log('3. Check if metadata.firmId is set in assistant');
  console.log('4. Verify webhook URL is accessible (tested separately)');
}

checkConfiguration().catch(console.error);

