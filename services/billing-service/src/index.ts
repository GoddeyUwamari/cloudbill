// ============================================================================
// Load Environment Variables FIRST
// ============================================================================
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

// ============================================================================
// Application Imports
// ============================================================================
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from '@shared/utils/logger';
import { errorHandler, notFoundHandler } from '@shared/middleware/error-handler';
import { billingDatabase } from './config/database.config';
import billingRoutes from './routes';

/**
 * Billing Service - Main Application
 * Handles subscription management, invoicing, and usage tracking
 */

// ============================================================================
// Environment Configuration
// ============================================================================

const PORT = process.env.BILLING_SERVICE_PORT || process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'billing-service';

// ============================================================================
// Express Application Setup
// ============================================================================

const app: Application = express();

// ============================================================================
// Security Middleware
// ============================================================================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production',
  crossOriginEmbedderPolicy: NODE_ENV === 'production',
}));

// CORS - Cross-Origin Resource Sharing
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
}));

// ============================================================================
// Body Parsing Middleware
// ============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// Request Logging Middleware
// ============================================================================

app.use((req: Request, res: Response, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      service: SERVICE_NAME,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
});

// ============================================================================
// Health Check Routes
// ============================================================================

app.get('/health', async (_req: Request, res: Response) => {
  const dbHealth = await billingDatabase.healthCheck();

  const healthStatus = {
    service: SERVICE_NAME,
    status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    dependencies: {
      database: dbHealth,
    },
  };

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    service: SERVICE_NAME,
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    const dbHealth = await billingDatabase.healthCheck();

    if (dbHealth.status === 'healthy') {
      res.status(200).json({
        service: SERVICE_NAME,
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        service: SERVICE_NAME,
        status: 'not ready',
        reason: 'Database not healthy',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      service: SERVICE_NAME,
      status: 'not ready',
      reason: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// API Routes
// ============================================================================

app.use('/api/billing', billingRoutes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: SERVICE_NAME,
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      liveness: '/health/live',
      readiness: '/health/ready',
      api: '/api/billing',
    },
  });
});

// ============================================================================
// Error Handling Middleware
// ============================================================================

// 404 Handler - Must be before error handler
app.use(notFoundHandler);

// Global Error Handler - Must be last
app.use(errorHandler);

// ============================================================================
// Database Initialization
// ============================================================================

async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Initializing database connection...', { service: SERVICE_NAME });
    await billingDatabase.initialize();
    logger.info('Database connection initialized successfully', { service: SERVICE_NAME });
  } catch (error) {
    logger.error('Failed to initialize database connection', {
      service: SERVICE_NAME,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// ============================================================================
// Server Startup
// ============================================================================

async function startServer(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`${SERVICE_NAME} started successfully`, {
        service: SERVICE_NAME,
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version,
        pid: process.pid,
      });
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`, {
        service: SERVICE_NAME,
      });

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed', { service: SERVICE_NAME });

        try {
          // Close database connections
          await billingDatabase.close();
          logger.info('Database connections closed', { service: SERVICE_NAME });

          logger.info('Graceful shutdown completed', { service: SERVICE_NAME });
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', {
            service: SERVICE_NAME,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout', { service: SERVICE_NAME });
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', {
      service: SERVICE_NAME,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// ============================================================================
// Process Error Handlers
// ============================================================================

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    service: SERVICE_NAME,
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', {
    service: SERVICE_NAME,
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

// ============================================================================
// Start Application
// ============================================================================

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

// Export app for testing
export default app;
