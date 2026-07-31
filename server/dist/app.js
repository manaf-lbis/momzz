"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const authRouter_1 = __importDefault(require("./router/authRouter"));
const app = (0, express_1.default)();
// Security & Content-Security-Policy headers for local development and DevTools compatibility
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', env_1.ENV.CLIENT_URL);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Security-Policy', "default-src 'self' http://localhost:* ws://localhost:*; connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:*; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;");
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
// Middleware
app.use((0, cors_1.default)({
    origin: env_1.ENV.CLIENT_URL,
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ONLINE',
        system: 'Momzz Garage Vehicle & Task Command API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            dummy: '/api/dummy',
            auth: '/api/auth',
        },
    });
});
// Handle Chrome devtools well-known probes gracefully
app.get('/.well-known/*', (req, res) => {
    res.status(200).json({ status: 'OK' });
});
// API Routes
app.use('/api/auth', authRouter_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        serverUrl: `http://localhost:${env_1.ENV.PORT}`,
        clientUrl: env_1.ENV.CLIENT_URL,
        timestamp: new Date().toISOString(),
    });
});
// Dummy API endpoint for live frontend testing
app.get('/api/dummy', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Dummy API connection successful!',
        data: {
            serverTime: new Date().toISOString(),
            environment: 'development',
            system: 'Momzz Vehicle & Task Command System',
            dummyStatus: 'CONNECTED',
        },
    });
});
// Bootstrapping Database & Server
(0, db_1.connectDB)().then(() => {
    app.listen(env_1.ENV.PORT, () => {
        console.log(`[SERVER] Momzz backend listening on http://localhost:${env_1.ENV.PORT}`);
        console.log(`[SERVER] Configured Client URL from env: ${env_1.ENV.CLIENT_URL}`);
    });
});
exports.default = app;
