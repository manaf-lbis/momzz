"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(env_1.ENV.MONGO_URI, {
            serverSelectionTimeoutMS: 3000,
        });
        console.log(`[DATABASE] Connected to MongoDB at ${env_1.ENV.MONGO_URI} successfully.`);
    }
    catch (error) {
        console.warn(`[DATABASE WARNING] Could not connect to local MongoDB (${env_1.ENV.MONGO_URI}): ${error.message}`);
        console.warn(`[DATABASE WARNING] Server will continue running for health and dummy endpoints.`);
    }
};
exports.connectDB = connectDB;
