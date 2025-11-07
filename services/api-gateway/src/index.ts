// services/api-gateway/src/index.ts
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import logger from '@shared/utils/logger';
import { errorHandler } from '@shared/middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { healthRouter } from './routes/health.routes';
import { SERVICES } from './config/services.config';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || '8080';
const port = parseInt(PORT, 10) || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173', // Vite default
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging with ID
app.use(requestLogger);

// ==========================================
// RATE LIMITING
// ==========================================

// Global rate limiter (per IP)
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.startsWith('/health');
  },
});

app.use(globalRateLimiter);

// Stricter rate limiter for auth endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication requests, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// HEALTH & INFO ENDPOINTS
// ==========================================

app.use('/health', healthRouter);

app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'CloudBill API Gateway',
    version: '1.0.0',
    status: 'running',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      billing: '/api/billing/*',
      payments: '/api/payments/*',
      notifications: '/api/notifications/*',
      analytics: '/api/analytics/* (coming soon)',
    },
  });
});

// ==========================================
// PROXY HELPER FUNCTION
// ==========================================

const createServiceProxy = (
  serviceName: string,
  targetUrl: string,
  pathPrefix?: string
): RequestHandler => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    logLevel: NODE_ENV === 'development' ? 'info' : 'warn',

    // Rewrite path to strip the service prefix
    pathRewrite: pathPrefix ? {
      [`^${pathPrefix}`]: '',
    } : undefined,

    // Add custom headers to forwarded requests
    onProxyReq: (proxyReq, req: any) => {
      // Re-stream parsed body for POST/PUT/PATCH requests
      if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
        try {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        } catch (error) {
          logger.error('Error writing body to proxy:', { error: error instanceof Error ? error.message : String(error) });
        }
      }
      
      // Forward user info from JWT middleware
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.id);
        proxyReq.setHeader('X-User-Email', req.user.email);
        proxyReq.setHeader('X-User-Role', req.user.role);
      }
      
      // Forward tenant ID
      if (req.tenantId) {
        proxyReq.setHeader('X-Tenant-ID', req.tenantId);
      }
      
      // Forward request ID for tracing
      if (req.id) {
        proxyReq.setHeader('X-Request-ID', req.id);
      }
      
      // Log proxy request
      logger.debug(`[Gateway → ${serviceName}] ${req.method} ${req.path}`);
    },
    
    // Handle proxy errors
    onError: (err, req, res: any) => {
      logger.error(`[Gateway] Proxy error for ${serviceName}:`, {
        error: err.message,
        service: serviceName,
        target: targetUrl,
        path: req.url,
      });
      
      res.status(503).json({
        error: 'Service Unavailable',
        message: `${serviceName} is currently unavailable. Please try again later.`,
        service: serviceName,
        timestamp: new Date().toISOString(),
      });
    },
    
    // Log successful proxy responses
    onProxyRes: (proxyRes, req) => {
      logger.debug(`[${serviceName} → Gateway] ${proxyRes.statusCode} ${req.method} ${req.url}`);
    },
  });
};

// ==========================================
// AUTH SERVICE ROUTES
// ==========================================

// All auth routes go through a single proxy
// Auth service will handle its own rate limiting and authentication
app.use(
  '/api/auth',
  authRateLimiter,
  createServiceProxy('auth-service', SERVICES.AUTH_SERVICE)
);

// ==========================================
// BILLING SERVICE ROUTES
// ==========================================

app.use(
  '/api/billing',
  createServiceProxy('billing-service', SERVICES.BILLING_SERVICE)
);

// ==========================================
// PAYMENT SERVICE ROUTES
// ==========================================

app.use(
  '/api/payments',
  createServiceProxy('payment-service', SERVICES.PAYMENT_SERVICE)
);

// ==========================================
// NOTIFICATION SERVICE ROUTES
// ==========================================

app.use(
  '/api/notifications',
  createServiceProxy('notification-service', SERVICES.NOTIFICATION_SERVICE)
);

// ==========================================
// ANALYTICS SERVICE ROUTES (Coming soon)
// ==========================================

app.use('/api/analytics', (_req: Request, res: Response) => {
  res.status(503).json({
    error: 'Service Not Available',
    message: 'Analytics service is not yet implemented.',
    comingSoon: true,
  });
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  logger.warn(`[Gateway] 404 - Route not found: ${req.method} ${req.path}`);
  
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

// ==========================================
// SERVER STARTUP
// ==========================================

const server = app.listen(port, '0.0.0.0', () => {
  logger.info('═══════════════════════════════════════════');
  logger.info('🚀 CloudBill API Gateway Started');
  logger.info('═══════════════════════════════════════════');
  logger.info(`📍 Port: ${port}`);
  logger.info(`🌍 Environment: ${NODE_ENV}`);
  logger.info(`🔗 Base URL: http://localhost:${port}`);
  logger.info(`💓 Health Check: http://localhost:${port}/health`);
  logger.info('');
  logger.info('📡 Registered Services:');
  logger.info(`   └─ Auth Service:         ${SERVICES.AUTH_SERVICE}`);
  logger.info(`   └─ Billing Service:      ${SERVICES.BILLING_SERVICE}`);
  logger.info(`   └─ Payment Service:      ${SERVICES.PAYMENT_SERVICE}`);
  logger.info(`   └─ Notification Service: ${SERVICES.NOTIFICATION_SERVICE}`);
  logger.info('');
  logger.info('🛣️  Available Routes:');
  logger.info('   └─ GET  /                       - Gateway info');
  logger.info('   └─ GET  /health                 - Health check (all services)');
  logger.info('   └─ GET  /health/live            - Liveness probe');
  logger.info('   └─ GET  /health/ready           - Readiness probe');
  logger.info('   └─ GET  /health/services        - Detailed service health');
  logger.info('   └─ ALL  /api/auth/*             - Auth Service');
  logger.info('   └─ ALL  /api/billing/*          - Billing Service');
  logger.info('   └─ ALL  /api/payments/*         - Payment Service');
  logger.info('   └─ ALL  /api/notifications/*    - Notification Service');
  logger.info('═══════════════════════════════════════════');
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

const shutdown = async () => {
  logger.info('');
  logger.info('🛑 Shutting down API Gateway...');
  
  server.close(() => {
    logger.info('✅ HTTP server closed');
    logger.info('👋 API Gateway shutdown complete');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('⚠️  Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
 logger.error('💥 Uncaught Exception:', { error: error.message, stack: error.stack });
  shutdown();
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('💥 Unhandled Rejection at:', { reason, promise: String(promise) });
  logger.error('Reason:', reason);
  shutdown();
});

export default app;