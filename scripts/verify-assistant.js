/**
 * Verify assistant has all required fields
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
const ASSISTANT_ID = '3946e037-e23e-4ff6-9da2-608771d468b3';

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

async function verify() {
  console.log('🔍 Verifying Assistant Configuration...\n');
  
  try {
    const res = await vapiRequest(`/assistant/${ASSISTANT_ID}`);
    
    if (res.status === 200) {
      const assistant = res.data;
      console.log('Assistant Details:');
      console.log(JSON.stringify(assistant, null, 2));
      
      console.log('\n✅ Required Fields Check:');
      console.log(`   Model: ${assistant.model ? '✅' : '❌'}`);
      console.log(`   Voice: ${assistant.voice ? '✅' : '❌'}`);
      console.log(`   Transcriber: ${assistant.transcriber ? '✅' : '❌'}`);
      console.log(`   First Message: ${assistant.firstMessage ? '✅' : '❌'}`);
      console.log(`   Server URL: ${assistant.server?.url ? '✅' : '❌'}`);
      console.log(`   Metadata: ${assistant.metadata ? '✅' : '❌'}`);
      
      if (!assistant.model || !assistant.voice || !assistant.transcriber || !assistant.firstMessage) {
        console.log('\n❌ MISSING REQUIRED FIELDS! This will break calls.');
      } else {
        console.log('\n✅ All required fields present');
      }
    } else {
      console.error(`❌ Error: ${res.status}`);
      console.error(JSON.stringify(res.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verify().catch(console.error);

