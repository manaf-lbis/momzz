import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/momzz',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'momzz_jwt_access_secret_key_15m_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'momzz_jwt_refresh_secret_key_15d_2026',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
};
