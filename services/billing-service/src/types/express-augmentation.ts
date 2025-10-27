/**
 * Express type augmentation for Billing Service
 */

import { Tenant, UserRole } from '@shared/types';

declare global {
  namespace Express {
    interface Request {
      // User authentication context
      user?: {
        userId: string;
        tenantId: string;
        role: UserRole;
        ip?: string;
        userAgent?: string;
      };

      // Tenant context
      tenant?: Tenant;
      tenantId?: string;
    }
  }
}

export {};
