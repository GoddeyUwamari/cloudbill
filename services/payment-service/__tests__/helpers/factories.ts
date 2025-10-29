/**
 * Test Data Factories for Payment Service
 */

import { faker } from '@faker-js/faker';
import { Pool } from 'pg';
import { UUID } from '@shared/types';

export async function createPayment(
  pool: Pool,
  options: {
    userId: UUID;
    tenantId: UUID;
    amount?: number;
    status?: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  }
): Promise<any> {
  const result = await pool.query(
    `INSERT INTO payments (user_id, tenant_id, amount, currency, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      options.userId,
      options.tenantId,
      options.amount || parseFloat(faker.commerce.price()),
      'USD',
      options.status || 'PENDING',
    ]
  );

  return result.rows[0];
}

export async function createPaymentMethod(
  pool: Pool,
  options: {
    userId: UUID;
    tenantId: UUID;
    type?: 'CARD' | 'BANK_ACCOUNT';
  }
): Promise<any> {
  const result = await pool.query(
    `INSERT INTO payment_methods (user_id, tenant_id, type, last4, brand)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      options.userId,
      options.tenantId,
      options.type || 'CARD',
      faker.finance.creditCardNumber().slice(-4),
      'visa',
    ]
  );

  return result.rows[0];
}
