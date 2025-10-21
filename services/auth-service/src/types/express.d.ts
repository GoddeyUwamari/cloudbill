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
      tenant?: any;
      tenantId?: string;
    }
  }
}

export {};
