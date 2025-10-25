/**
 * Express type augmentation for Auth Service
 */

import { Tenant, UserRole } from '../../../shared/types';

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
      
      // Tenant context (must match shared/middleware/tenant.middleware.ts)
      tenant?: Tenant;
      tenantId?: string;  // ← This was missing!
    }
  }
}

export {};
