import dotenv from 'dotenv';
dotenv.config();

const getSecret = (name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET', developmentValue: string) => {
  const value = process.env[name];
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`${name} must be set in production.`);
  }
  return value || developmentValue;
};

const configuredOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

if (process.env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
  throw new Error('CLIENT_URL or CORS_ORIGINS must be set in production.');
}

export const ENV = {
  PORT: process.env.PORT || '5000',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/momzz',
  JWT_ACCESS_SECRET: getSecret('JWT_ACCESS_SECRET', 'momzz_dev_access_secret_only'),
  JWT_REFRESH_SECRET: getSecret('JWT_REFRESH_SECRET', 'momzz_dev_refresh_secret_only'),
  CLIENT_URL: process.env.CLIENT_URL || '',
  CORS_ORIGINS: configuredOrigins,
};
