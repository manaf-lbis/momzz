import dotenv from 'dotenv';
dotenv.config();

const getSecret = (name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET', developmentValue: string) => {
  const value = process.env[name];
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`${name} must be set in production.`);
  }
  return value || developmentValue;
};

const parseCommaSeparatedUrls = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(/[,;\s]+/)
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

const clientUrls = parseCommaSeparatedUrls(process.env.CLIENT_URL);
const corsOrigins = parseCommaSeparatedUrls(process.env.CORS_ORIGINS);

// Merge and deduplicate all allowed origins from both CLIENT_URL and CORS_ORIGINS
const allConfiguredOrigins = Array.from(new Set([...clientUrls, ...corsOrigins]));

if (process.env.NODE_ENV === 'production' && allConfiguredOrigins.length === 0) {
  throw new Error('CLIENT_URL or CORS_ORIGINS must be set in production.');
}

export const ENV = {
  PORT: process.env.PORT || '5000',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/momzz',
  JWT_ACCESS_SECRET: getSecret('JWT_ACCESS_SECRET', 'momzz_dev_access_secret_only'),
  JWT_REFRESH_SECRET: getSecret('JWT_REFRESH_SECRET', 'momzz_dev_refresh_secret_only'),
  CLIENT_URL: clientUrls[0] || process.env.CLIENT_URL || '',
  CLIENT_URLS: clientUrls,
  CORS_ORIGINS: allConfiguredOrigins,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  REDIS_URL: process.env.REDIS_URL || '',
};

