/**
 * PostgreSQL Database Connection Manager
 * Handles connection pooling, multi-tenancy, and graceful shutdown
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

// ============================================================================
// Configuration
// ============================================================================

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'cloudbill',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  
  // Connection pool settings
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
  
  // Statement timeout (prevent long-running queries)
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000', 10),
  
  // Query timeout
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000', 10),
  
  // SSL configuration (production)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // Set to true in production with proper certs
  } : false,
};

// ============================================================================
// Connection Pool
// ============================================================================

let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    pool = new Pool(poolConfig);

    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    logger.info('Database connection pool initialized successfully', {
      host: poolConfig.host,
      database: poolConfig.database,
      poolSize: `${poolConfig.min}-${poolConfig.max}`,
      serverTime: result.rows[0].now,
    });

    // Handle pool errors
    pool.on('error', (err: Error) => {
      logger.error('Unexpected database pool error', {
        error: err.message,
        stack: err.stack,
      });
    });

    // Log pool events in development
    if (process.env.NODE_ENV === 'development') {
      pool.on('connect', () => {
        logger.debug('New database client connected to pool');
      });

      pool.on('acquire', () => {
        logger.debug('Database client acquired from pool');
      });

      pool.on('remove', () => {
        logger.debug('Database client removed from pool');
      });
    }
  } catch (error) {
    logger.error('Failed to initialize database connection pool', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

/**
 * Get database connection pool
 */
export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return pool;
};

/**
 * Execute a query with automatic connection handling
 */
export const query = async <T = any>(
  text: string,
  params?: any[]
): Promise<T[]> => {
  const start = Date.now();
  
  try {
    const pool = getPool();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    logger.debug('Executed database query', {
      query: text.substring(0, 100), // Log first 100 chars
      duration: `${duration}ms`,
      rows: result.rowCount,
    });

    return result.rows as T[];
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Database query failed', {
      query: text.substring(0, 100),
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

/**
 * Execute a query and return a single row
 */
export const queryOne = async <T = any>(
  text: string,
  params?: any[]
): Promise<T | null> => {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Get a client from the pool for transaction handling
 */
export const getClient = async (): Promise<PoolClient> => {
  const pool = getPool();
  return await pool.connect();
};

/**
 * Execute a transaction with automatic rollback on error
 */
export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    
    logger.debug('Transaction committed successfully');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    
    logger.error('Transaction rolled back due to error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Enable Row-Level Security for multi-tenancy
 * Sets the tenant_id context for the current session
 */
export const setTenantContext = async (
  client: PoolClient,
  tenantId: string
): Promise<void> => {
  await client.query('SET app.current_tenant_id = $1', [tenantId]);
  logger.debug('Tenant context set', { tenantId });
};

/**
 * Execute query with tenant context (for multi-tenancy)
 */
export const queryWithTenant = async <T = any>(
  tenantId: string,
  text: string,
  params?: any[]
): Promise<T[]> => {
  const client = await getClient();
  
  try {
    await setTenantContext(client, tenantId);
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
};

/**
 * Health check for database connection
 */
export const checkDatabaseHealth = async (): Promise<{
  healthy: boolean;
  latency: number;
  poolSize: number;
  error?: string;
}> => {
  const start = Date.now();
  
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    const latency = Date.now() - start;
    
    return {
      healthy: true,
      latency,
      poolSize: pool.totalCount,
    };
  } catch (error) {
    const latency = Date.now() - start;
    
    return {
      healthy: false,
      latency,
      poolSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Gracefully close database connection pool
 */
export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      logger.info('Database connection pool closed gracefully');
    } catch (error) {
      logger.error('Error closing database connection pool', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
};

// ============================================================================
// Graceful Shutdown Handler
// ============================================================================

/**
 * Setup graceful shutdown handlers
 */
export const setupDatabaseShutdownHandlers = (): void => {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, closing database connections...`);
    await closeDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// ============================================================================
// Export
// ============================================================================

export default {
  initializeDatabase,
  getPool,
  query,
  queryOne,
  getClient,
  transaction,
  setTenantContext,
  queryWithTenant,
  checkDatabaseHealth,
  closeDatabase,
  setupDatabaseShutdownHandlers,
};