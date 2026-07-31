import mongoose from 'mongoose';
import { ENV } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(ENV.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[DATABASE] Connected to MongoDB at ${ENV.MONGO_URI} successfully.`);
  } catch (error: any) {
    console.warn(`[DATABASE WARNING] Could not connect to local MongoDB (${ENV.MONGO_URI}): ${error.message}`);
    console.warn(`[DATABASE WARNING] Server will continue running for health and dummy endpoints.`);
  }
};
