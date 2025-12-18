/**
 * Utility script to generate secure API keys
 * Usage: node scripts/generate-api-key.js
 */

const crypto = require('crypto');

function generateAPIKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

console.log('Generated API Key:');
console.log(generateAPIKey());
console.log('\nCopy this to your .env file as API_KEY=');
console.log('Keep this secure and never commit it to version control!');

