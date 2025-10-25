/**
 * Express type augmentation for shared middleware
 */

import { Tenant, UserRole, RequestContext } from './index';

declare global {
  namespace Express {
    interface Request {
      // User authentication context
      user?: RequestContext;
      
      // Tenant context
      tenant?: Tenant;
      tenantId?: string;
    }
  }
}

export {};
