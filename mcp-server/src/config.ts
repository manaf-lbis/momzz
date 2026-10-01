import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/momzz'),
  UPSTREAM_API_URL: z.string().url().default('http://localhost:5000'),
  INTERNAL_SERVICE_KEY: z.string().min(16).default('momzz_internal_service_key_enterprise_mcp_secure'),
  JWT_ACCESS_SECRET: z.string().default('momzz_dev_access_secret_only'),
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:3000')
    .transform((val) =>
      val
        .split(/[,;\s]+/)
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean)
    ),
  ALLOWED_HOSTS: z
    .string()
    .default('localhost:4000,127.0.0.1:4000,localhost,127.0.0.1')
    .transform((val) =>
      val
        .split(/[,;\s]+/)
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean)
    ),
  USE_HTTPS: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),
  SSL_KEY_PATH: z.string().optional(),
  SSL_CERT_PATH: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[CONFIG ERROR] Invalid environment configuration:');
  console.error(parsed.error.format());
  throw new Error('Invalid environment configuration for MCP Server.');
}

export const config = parsed.data;
export type Config = typeof config;
