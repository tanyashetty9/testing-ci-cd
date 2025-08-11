import crypto from 'crypto';
import dotenv from 'dotenv';
import { logger } from './logger.util';

dotenv.config();

const algorithm: string = 'aes-256-cbc';
const key = Buffer.from(process.env.AES_KEY || '', 'base64');
const iv = Buffer.from(process.env.AES_IV || '', 'base64');

// Encrypt data
const encryptData = (text: string): string => {
  try {
    logger.info('[utils/encryption.util]-[encryptData]-Encrypting data...');
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    logger.info('[utils/encryption.util]-[encryptData]-Cipher created');
    let encrypted = cipher.update(text, 'utf8', 'hex');
    logger.info('[utils/encryption.util]-[encryptData]-Data encrypted');
    encrypted += cipher.final('hex');
    logger.info('[utils/encryption.util]-[encryptData]-Finalizing encryption');
    return encrypted; // full ciphertext
  } catch (error) {
    logger.error(
      '[utils/encryption.util]-[encryptData]-Error encrypting data: ' + error,
    );
    throw new Error('Encryption failed');
  }
};

// Decrypt data
const decryptData = async (encryptedData: string): Promise<string> => {
  try {
    logger.info('[utils/encryption.util]-[decryptData]-Decrypting data...');
    logger.info(`Key length: ${key.length}, IV length: ${iv.length}`);

    // Validate key and IV lengths
    if (key.length !== 32) throw new Error('Invalid key length');
    if (iv.length !== 16) throw new Error('Invalid IV length');

    logger.info('[utils/encryption.util]-[decryptData]-Creating decipher...');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    logger.info('[utils/encryption.util]-[decryptData]-Decipher created');

    // Decrypt the full ciphertext
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    logger.info('[utils/encryption.util]-[decryptData]-Data decrypted');
    logger.info('[utils/encryption.util]-[decryptData]-Finalizing decryption');
    return decrypted; // return the decrypted text
  } catch (error) {
    logger.error(
      '[utils/encryption.util]-[decryptData]-Error decrypting data: ' + error,
    );
    throw new Error('Decryption failed');
  }
};

export { encryptData, decryptData };
