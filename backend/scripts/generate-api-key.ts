/**
 * Utility script to generate secure API keys
 * Usage: npm run generate:api-key [length]
 * 
 * Default length is 32 characters (64 hex characters = 32 bytes)
 * Minimum recommended: 32 characters
 */

import * as crypto from 'crypto';

function generateAPIKey(length: number = 32): string {
  if (length < 16) {
    console.error('⚠️  Warning: API key length should be at least 16 characters (32 hex)');
    console.error('   Using minimum recommended length of 32 characters');
    length = 32;
  }
  // Generate random bytes and convert to hex (each byte = 2 hex chars)
  const bytesNeeded = Math.ceil(length / 2);
  return crypto.randomBytes(bytesNeeded).toString('hex').substring(0, length);
}

// Get length from command line argument
const lengthArg = process.argv[2];
const keyLength = lengthArg ? parseInt(lengthArg, 10) : 32;

const apiKey = generateAPIKey(keyLength);

console.log('\n✅ Generated Secure API Key:');
console.log('─'.repeat(60));
console.log(apiKey);
console.log('─'.repeat(60));
console.log(`\nLength: ${apiKey.length} characters`);
console.log('\n📋 Copy this to your .env file:');
console.log(`API_KEY=${apiKey}`);
console.log('\n⚠️  SECURITY REMINDERS:');
console.log('   • Keep this key secret and never commit it to version control');
console.log('   • Use different keys for development and production');
console.log('   • Rotate keys regularly');
console.log('   • Never expose keys in logs or error messages\n');

