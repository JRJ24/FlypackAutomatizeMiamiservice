import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; 

const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error("Missing required environment variable: ENCRYPTION_KEY");
  }

  return Buffer.from(key);
};

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decrypt = (text: string): string => {
  if (!text || !text.includes(':')) return text;
  
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
};

export const safeDecrypt = (text: unknown): string => {
  if (typeof text !== "string") return "";

  let value = text;

  try {
    for (let index = 0; index < 5; index += 1) {
      if (!value.includes(":")) return value;

      const decrypted = decrypt(value);

      if (decrypted === value) return value;

      value = decrypted;
    }

    return value;
  } catch (error) {
    return value;
  }
};
