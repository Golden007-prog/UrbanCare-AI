const crypto = require('crypto');

// Note: In an actual production scenario, ENCRYPTION_KEY must be a 32-byte 
// hex string stored securely in environment variables.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16; 

/**
 * Encrypt a string using aes-256-cbc.
 * Returns iv:encrypted_data
 */
function encrypt(text) {
  if (!text) return null;
  // Convert key to buffer, ensuring 32 bytes
  let keyBuffer;
  if (ENCRYPTION_KEY.length === 64) {
      keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  } else {
      // Fallback if not proper hex string length
      const hash = crypto.createHash('sha256');
      hash.update(ENCRYPTION_KEY);
      keyBuffer = hash.digest();
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt an aes-256-cbc encrypted string.
 * Expects iv:encrypted_data
 */
function decrypt(text) {
  if (!text) return null;
  try {
      let keyBuffer;
      if (ENCRYPTION_KEY.length === 64) {
          keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
      } else {
          const hash = crypto.createHash('sha256');
          hash.update(ENCRYPTION_KEY);
          keyBuffer = hash.digest();
      }

      const textParts = text.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
  } catch (err) {
      console.error('Decryption failed:', err.message);
      return null;
  }
}

module.exports = {
  encrypt,
  decrypt
};
