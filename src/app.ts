import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';

import config from './config/index.js';
import { swaggerSpec } from './config/swagger.js';
import { logger, morganStream } from './shared/logger/index.js';
import { errorHandler, notFoundHandler } from './shared/errors/index.js';
import { languageMiddleware, guestRateLimiter } from './shared/middlewares/index.js';
import { sanitizeInput } from './shared/middlewares/sanitize.middleware.js';
import { sendSuccessResponse } from './shared/utils/response.helper.js';
import { getQueueHealth } from './shared/queue/index.js';

// Import API routes
import publicRoutes from './api/v1/public/index.js';
import adminRoutes from './api/v1/admin/index.js';
import restaurantRoutes from './api/v1/restaurant/index.js';
import courierRoutes from './api/v1/courier/index.js';
import paymentWebhookRoutes from './modules/payment/payment.webhook.routes.js';

/**
 * Create and configure Express application
 */
export const createApp = (): Application => {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet());
  app.use(hpp()); // Prevent HTTP Parameter Pollution

  // CORS configuration
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept-Language',
        'X-Request-ID',
        'x-language',
      ],
    })
  );

  // Payment webhook routes (mounted BEFORE express.json() — Stripe needs raw body)
  app.use(`${config.apiPrefix}/${config.apiVersion}/webhooks/payments`, paymentWebhookRoutes);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // NoSQL injection prevention — sanitize req.body & req.params
  app.use(sanitizeInput);

  // Compression
  app.use(compression());

  // HTTP request logging (skip in test environment)
  if (!config.isTest) {
    app.use(
      morgan(config.isDevelopment ? 'dev' : 'combined', {
        stream: morganStream,
      })
    );
  }

  // Language resolution middleware
  app.use(languageMiddleware);

  // Rate limiting for all routes (basic protection)
  app.use(guestRateLimiter);

  // Health check endpoint (before API routes)
  app.get(`${config.apiPrefix}/${config.apiVersion}/health`, (_req: Request, res: Response) => {
    sendSuccessResponse(res, 200, 'API is healthy', {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.env,
      version: config.apiVersion,
    });
  });

  // Queue health endpoint
  app.get(
    `${config.apiPrefix}/${config.apiVersion}/health/queues`,
    async (_req: Request, res: Response) => {
      try {
        const queues = await getQueueHealth();
        sendSuccessResponse(res, 200, 'Queue health retrieved', {
          status: 'ok',
          timestamp: new Date().toISOString(),
          queues,
        });
      } catch (error) {
        sendSuccessResponse(res, 503, 'Queue health check failed', {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: (error as Error).message,
        });
      }
    }
  );

  // API Documentation (Swagger UI)
  app.use(
    `${config.apiPrefix}/${config.apiVersion}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec as object, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Just Eat Clone - API Docs',
    })
  );

  // API Routes
  app.use(`${config.apiPrefix}/${config.apiVersion}/public`, publicRoutes);
  app.use(`${config.apiPrefix}/${config.apiVersion}/admin`, adminRoutes);
  app.use(`${config.apiPrefix}/${config.apiVersion}/restaurant`, restaurantRoutes);
  app.use(`${config.apiPrefix}/${config.apiVersion}/courier`, courierRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  logger.info('Express app created and configured');

  return app;
};

export default createApp;
