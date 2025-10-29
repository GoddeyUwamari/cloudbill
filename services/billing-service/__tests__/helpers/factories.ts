/**
 * Test Data Factories for Billing Service
 */

import { faker } from '@faker-js/faker';
import { Pool } from 'pg';
import { UUID } from '@shared/types';

// ============================================================================
// Subscription Plan Factory
// ============================================================================

export interface CreatePlanOptions {
  name?: string;
  description?: string;
  price?: number;
  billingPeriod?: 'MONTHLY' | 'YEARLY';
  status?: 'ACTIVE' | 'INACTIVE';
}

export async function createSubscriptionPlan(
  pool: Pool,
  options: CreatePlanOptions = {}
): Promise<any> {
  const result = await pool.query(
    `INSERT INTO subscription_plans (name, description, price, billing_period, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, description, price, billing_period as "billingPeriod",
               status, created_at as "createdAt", updated_at as "updatedAt"`,
    [
      options.name || faker.commerce.productName(),
      options.description || faker.commerce.productDescription(),
      options.price || parseFloat(faker.commerce.price()),
      options.billingPeriod || 'MONTHLY',
      options.status || 'ACTIVE',
    ]
  );

  return result.rows[0];
}

// ============================================================================
// Subscription Factory
// ============================================================================

export interface CreateSubscriptionOptions {
  userId?: UUID;
  tenantId?: UUID;
  planId?: UUID;
  status?: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

export async function createSubscription(
  pool: Pool,
  options: CreateSubscriptionOptions
): Promise<any> {
  const result = await pool.query(
    `INSERT INTO subscriptions (user_id, tenant_id, plan_id, status, current_period_start, current_period_end)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id as "userId", tenant_id as "tenantId", plan_id as "planId",
               status, current_period_start as "currentPeriodStart",
               current_period_end as "currentPeriodEnd",
               created_at as "createdAt", updated_at as "updatedAt"`,
    [
      options.userId,
      options.tenantId,
      options.planId,
      options.status || 'ACTIVE',
      options.currentPeriodStart || new Date(),
      options.currentPeriodEnd || faker.date.future(),
    ]
  );

  return result.rows[0];
}

// ============================================================================
// Invoice Factory
// ============================================================================

export interface CreateInvoiceOptions {
  userId?: UUID;
  tenantId?: UUID;
  subscriptionId?: UUID;
  amount?: number;
  status?: 'DRAFT' | 'PENDING' | 'PAID' | 'VOID';
  dueDate?: Date;
}

export async function createInvoice(
  pool: Pool,
  options: CreateInvoiceOptions
): Promise<any> {
  const invoiceNumber = `INV-${faker.string.alphanumeric(8).toUpperCase()}`;

  const result = await pool.query(
    `INSERT INTO invoices (invoice_number, user_id, tenant_id, subscription_id, amount, status, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, invoice_number as "invoiceNumber", user_id as "userId",
               tenant_id as "tenantId", subscription_id as "subscriptionId",
               amount, status, due_date as "dueDate",
               created_at as "createdAt", updated_at as "updatedAt"`,
    [
      invoiceNumber,
      options.userId,
      options.tenantId,
      options.subscriptionId,
      options.amount || parseFloat(faker.commerce.price()),
      options.status || 'PENDING',
      options.dueDate || faker.date.future(),
    ]
  );

  return result.rows[0];
}

// ============================================================================
// Usage Record Factory
// ============================================================================

export interface CreateUsageRecordOptions {
  subscriptionId?: UUID;
  tenantId?: UUID;
  metricName?: string;
  quantity?: number;
  timestamp?: Date;
}

export async function createUsageRecord(
  pool: Pool,
  options: CreateUsageRecordOptions
): Promise<any> {
  const result = await pool.query(
    `INSERT INTO usage_records (subscription_id, tenant_id, metric_name, quantity, timestamp)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, subscription_id as "subscriptionId", tenant_id as "tenantId",
               metric_name as "metricName", quantity, timestamp,
               created_at as "createdAt"`,
    [
      options.subscriptionId,
      options.tenantId,
      options.metricName || 'api_calls',
      options.quantity || faker.number.int({ min: 1, max: 1000 }),
      options.timestamp || new Date(),
    ]
  );

  return result.rows[0];
}

// ============================================================================
// Tenant Factory (for billing tests)
// ============================================================================

export async function createTenant(pool: Pool): Promise<any> {
  const result = await pool.query(
    `INSERT INTO tenants (name, slug, billing_email, domain, status, settings)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, slug, billing_email as "billingEmail", domain, status, settings,
               created_at as "createdAt", updated_at as "updatedAt"`,
    [
      faker.company.name(),
      faker.helpers.slugify(faker.company.name()).toLowerCase(),
      faker.internet.email(),
      faker.internet.domainName(),
      'ACTIVE',
      JSON.stringify({}),
    ]
  );

  return result.rows[0];
}

// ============================================================================
// User Factory (for billing tests)
// ============================================================================

export async function createUser(pool: Pool, tenantId: UUID): Promise<any> {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, status, tenant_id, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, first_name as "firstName", last_name as "lastName",
               role, status, tenant_id as "tenantId", email_verified as "emailVerified",
               created_at as "createdAt", updated_at as "updatedAt"`,
    [
      faker.internet.email(),
      '$2b$10$hashedpassword',
      faker.person.firstName(),
      faker.person.lastName(),
      'USER',
      'ACTIVE',
      tenantId,
      true,
    ]
  );

  return result.rows[0];
}
