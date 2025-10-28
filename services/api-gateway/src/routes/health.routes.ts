// services/api-gateway/src/routes/health.routes.ts
import { Router, Request, Response } from 'express';
import logger from '@shared/utils/logger';
import { SERVICES } from '../config/services.config';

const router = Router();

/**
 * Check if a service is healthy by making HTTP request to its health endpoint
 */
const checkServiceHealth = async (
  _serviceName: string,
  serviceUrl: string
): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number; error?: string }> => {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(`${serviceUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return { status: 'healthy', responseTime };
    } else {
      return {
        status: 'unhealthy',
        responseTime,
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'unhealthy',
      responseTime,
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
    };
  }
};

/**
 * GET /health
 * Comprehensive health check - checks gateway and all registered services
 */
router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Check all services in parallel
    const serviceChecks = await Promise.all([
      checkServiceHealth('auth-service', SERVICES.AUTH_SERVICE),
      checkServiceHealth('billing-service', SERVICES.BILLING_SERVICE),
      checkServiceHealth('payment-service', SERVICES.PAYMENT_SERVICE),
      checkServiceHealth('notification-service', SERVICES.NOTIFICATION_SERVICE),
    ]);

    const services = {
      'auth-service': serviceChecks[0],
      'billing-service': serviceChecks[1],
      'payment-service': serviceChecks[2],
      'notification-service': serviceChecks[3],
    };
    
    // Determine overall health
    const allHealthy = Object.values(services).every(
      (service) => service.status === 'healthy'
    );
    
    const totalDuration = Date.now() - startTime;
    
    const healthStatus = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      gateway: {
        status: 'healthy',
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          unit: 'MB',
        },
        cpu: {
          user: process.cpuUsage().user,
          system: process.cpuUsage().system,
        },
      },
      services,
      checks: {
        duration: `${totalDuration}ms`,
        total: Object.keys(services).length,
        healthy: Object.values(services).filter((s) => s.status === 'healthy').length,
        unhealthy: Object.values(services).filter((s) => s.status === 'unhealthy').length,
      },
    };
    
    // Return 200 if all healthy, 503 if any service is down
    const statusCode = allHealthy ? 200 : 503;
    
    if (!allHealthy) {
      logger.warn('[Gateway] Health check detected unhealthy services', healthStatus);
    }
    
    res.status(statusCode).json(healthStatus);
  } catch (error: any) {
    logger.error('[Gateway] Health check error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      gateway: {
        status: 'healthy',
      },
    });
  }
});

/**
 * GET /health/live
 * Kubernetes liveness probe - checks if gateway is running
 * Should return 200 if the application is alive
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/ready
 * Kubernetes readiness probe - checks if gateway is ready to accept traffic
 * Should return 200 if the application can handle requests
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check if critical services are available
    const serviceChecks = await Promise.all([
      checkServiceHealth('auth-service', SERVICES.AUTH_SERVICE),
      checkServiceHealth('billing-service', SERVICES.BILLING_SERVICE),
      checkServiceHealth('payment-service', SERVICES.PAYMENT_SERVICE),
      checkServiceHealth('notification-service', SERVICES.NOTIFICATION_SERVICE),
    ]);

    const services = {
      'auth-service': serviceChecks[0],
      'billing-service': serviceChecks[1],
      'payment-service': serviceChecks[2],
      'notification-service': serviceChecks[3],
    };

    // Gateway is ready if auth service is healthy (critical service)
    const isReady = services['auth-service'].status === 'healthy';

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        services,
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Critical services unavailable',
        services,
      });
    }
  } catch (error: any) {
    logger.error('[Gateway] Readiness check error:', error);

    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /health/services
 * Detailed service health check
 */
router.get('/services', async (_req: Request, res: Response) => {
  try {
    const serviceChecks = await Promise.all([
      checkServiceHealth('auth-service', SERVICES.AUTH_SERVICE),
      checkServiceHealth('billing-service', SERVICES.BILLING_SERVICE),
      checkServiceHealth('payment-service', SERVICES.PAYMENT_SERVICE),
      checkServiceHealth('notification-service', SERVICES.NOTIFICATION_SERVICE),
    ]);

    const services = [
      {
        name: 'auth-service',
        url: SERVICES.AUTH_SERVICE,
        ...serviceChecks[0],
      },
      {
        name: 'billing-service',
        url: SERVICES.BILLING_SERVICE,
        ...serviceChecks[1],
      },
      {
        name: 'payment-service',
        url: SERVICES.PAYMENT_SERVICE,
        ...serviceChecks[2],
      },
      {
        name: 'notification-service',
        url: SERVICES.NOTIFICATION_SERVICE,
        ...serviceChecks[3],
      },
    ];
    
    res.json({
      timestamp: new Date().toISOString(),
      total: services.length,
      healthy: services.filter((s) => s.status === 'healthy').length,
      unhealthy: services.filter((s) => s.status === 'unhealthy').length,
      services,
    });
  } catch (error: any) {
    logger.error('[Gateway] Service health check error:', error);
    
    res.status(500).json({
      error: 'Failed to check service health',
      message: error.message,
    });
  }
});

export { router as healthRouter };