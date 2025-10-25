/**
 * Express type augmentation for Auth Service
 */

import { Tenant, UserRole } from '../../../../shared/types';

declare global {
  namespace Express {
    interface Request {
      // User authentication context
      user?: {
        userId: string;
        tenantId: string;
        role: UserRole;  // ← Was 'string', now UserRole
        ip?: string;
        userAgent?: string;
      };
      
      // Tenant context
      tenant?: Tenant;      // ← Was 'any', now Tenant
      tenantId?: string;
    }
  }
}

export {};
