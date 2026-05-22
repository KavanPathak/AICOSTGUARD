import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Route Imports
import authRoutes from './routes/authRoutes';
import appRoutes from './routes/appRoutes';
import apiKeyRoutes from './routes/apiKeyRoutes';
import proxyRoutes from './routes/proxyRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import alertRoutes from './routes/alertRoutes';

const server = express();

// Middleware
server.use(cors({
  origin: '*', // Allow dashboard connection from Vercel/localhost
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-OpenAI-API-Key'],
}));
server.use(express.json());

// Request logger middleware
server.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
server.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// API Routes
server.use('/api/auth', authRoutes);
server.use('/api/apps', appRoutes);
server.use('/api/keys', apiKeyRoutes);
server.use('/api/proxy', proxyRoutes);
server.use('/api/analytics', analyticsRoutes);
server.use('/api/alerts', alertRoutes);

// Global Error Handler
server.use(errorHandler);

const PORT = config.port;
server.listen(PORT, () => {
  logger.info(`AICostGuard Backend listening on port ${PORT}`);
});
export default server;
