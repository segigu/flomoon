#!/usr/bin/env node

/**
 * Generate VAPID keys for Web Push notifications
 *
 * Usage: node scripts/generateVapidKeys.js
 */

const crypto = require('crypto');

// Generate ECDH P-256 key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: {
    type: 'spki',
    format: 'der'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'der'
  }
});

// Extract raw public key (65 bytes: 0x04 + 32 bytes X + 32 bytes Y)
const rawPublicKey = publicKey.slice(-65);

// Extract raw private key (32 bytes)
const rawPrivateKey = privateKey.slice(-32);

// Convert to URL-safe Base64
const publicKeyBase64 = rawPublicKey.toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

const privateKeyBase64 = rawPrivateKey.toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

console.log('\n=== VAPID Keys Generated ===\n');
console.log('Public Key (use in client code):');
console.log(publicKeyBase64);
console.log('\nPrivate Key (store in Supabase Secrets):');
console.log(privateKeyBase64);
console.log('\n=== Next Steps ===\n');
console.log('1. Update src/utils/pushNotifications.ts:');
console.log(`   const VAPID_PUBLIC_KEY = '${publicKeyBase64}';`);
console.log('\n2. Add secrets to Supabase Dashboard:');
console.log('   - Go to: https://supabase.com/dashboard/project/mbocfgtfkrlclmqjezfv/settings/functions');
console.log('   - Add secret: VAPID_PUBLIC_KEY = ' + publicKeyBase64);
console.log('   - Add secret: VAPID_PRIVATE_KEY = ' + privateKeyBase64);
console.log('\n3. Add existing API keys to Supabase:');
console.log('   - CLAUDE_API_KEY (from .env.local)');
console.log('   - OPENAI_API_KEY (from .env.local, optional)');
console.log('\n');
