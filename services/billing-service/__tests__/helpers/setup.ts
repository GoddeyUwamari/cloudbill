/**
 * Test Setup and Teardown for Billing Service
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'cloudbill_test';

// Test database pool
let testPool: Pool | null = null;

export async function setupTestDatabase(): Promise<Pool> {
  if (testPool) {
    return testPool;
  }

  testPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    database: process.env.DB_NAME || 'cloudbill_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false,
  });

  try {
    const client = await testPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Test database connected successfully');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }

  return testPool;
}

export async function cleanTestDatabase(): Promise<void> {
  if (!testPool) {
    return;
  }

  try {
    // Disable RLS for testing
    await testPool.query('ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY');
    await testPool.query('ALTER TABLE IF EXISTS subscriptions DISABLE ROW LEVEL SECURITY');
    await testPool.query('ALTER TABLE IF EXISTS subscription_plans DISABLE ROW LEVEL SECURITY');
    await testPool.query('ALTER TABLE IF EXISTS usage_records DISABLE ROW LEVEL SECURITY');
    await testPool.query('ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY');
    await testPool.query('ALTER TABLE IF EXISTS tenants DISABLE ROW LEVEL SECURITY');

    // Clean tables in reverse order of dependencies
    await testPool.query('DELETE FROM usage_records');
    await testPool.query('DELETE FROM invoice_items');
    await testPool.query('DELETE FROM invoices');
    await testPool.query('DELETE FROM subscriptions');
    await testPool.query('DELETE FROM users');
    await testPool.query('DELETE FROM tenants');

    // Re-enable RLS
    await testPool.query('ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY');
    await testPool.query('ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY');
    await testPool.query('ALTER TABLE IF EXISTS subscription_plans ENABLE ROW LEVEL SECURITY');
    await testPool.query('ALTER TABLE IF EXISTS usage_records ENABLE ROW LEVEL SECURITY');
    await testPool.query('ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY');
    await testPool.query('ALTER TABLE IF EXISTS tenants ENABLE ROW LEVEL SECURITY');

    console.log('Test database cleaned');
  } catch (error) {
    console.error('Failed to clean test database:', error);
    throw error;
  }
}

export async function teardownTestDatabase(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
    console.log('Test database connection closed');
  }
}

export function getTestPool(): Pool {
  if (!testPool) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testPool;
}

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await cleanTestDatabase();
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanTestDatabase();
});

export { testPool };
