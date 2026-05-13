const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY = crypto.scryptSync(process.env.JWT_SECRET || 'nexcore-default-secret', 'salt', 32);
const IV_LENGTH = 16;

const encrypt = (buffer) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
  return encrypted;
};

const decrypt = (encryptedBuffer) => {
  const iv = encryptedBuffer.slice(0, IV_LENGTH);
  const encryptedData = encryptedBuffer.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted;
};

module.exports = { encrypt, decrypt };
