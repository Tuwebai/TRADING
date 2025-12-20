/**
 * Utility script to generate encryption key for broker credentials
 * Usage: npm run generate:encryption-key
 * 
 * This generates a 32-byte (256-bit) key for AES-256-GCM encryption
 * Store this in Supabase Secrets as ENCRYPTION_KEY
 */

import * as crypto from 'crypto';

function generateEncryptionKey(): string {
  // Generate 32 random bytes (256 bits for AES-256)
  const key = crypto.randomBytes(32);
  // Convert to hex string (64 hex characters)
  return key.toString('hex');
}

const encryptionKey = generateEncryptionKey();

console.log('\n✅ Generated Encryption Key (32 bytes / 256 bits):');
console.log('─'.repeat(60));
console.log(encryptionKey);
console.log('─'.repeat(60));
console.log(`\nLength: ${encryptionKey.length} hex characters (${encryptionKey.length / 2} bytes)`);
console.log('\n📋 Add this to Supabase Secrets:');
console.log(`   Name: ENCRYPTION_KEY`);
console.log(`   Value: ${encryptionKey}`);
console.log('\n📖 Instructions:');
console.log('   1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets');
console.log('   2. Click "Add new secret"');
console.log('   3. Name: ENCRYPTION_KEY');
console.log('   4. Value: (paste the key above)');
console.log('   5. Click "Save"');
console.log('\n⚠️  SECURITY REMINDERS:');
console.log('   • Keep this key secret and never commit it to version control');
console.log('   • Use different keys for development and production');
console.log('   • Rotate keys periodically');
console.log('   • Never expose keys in logs or error messages');
console.log('   • If key is compromised, generate new one and re-encrypt all credentials\n');

