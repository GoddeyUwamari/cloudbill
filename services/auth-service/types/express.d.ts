
import { User, Tenant } from '@shared/types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        tenantId: string;
        role: string;
        ip?: string;
        userAgent?: string;
      };
      tenant?: Tenant;
      tenantId?: string;
    }
  }
}

export {}
