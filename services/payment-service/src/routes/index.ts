import { Router } from 'express';
import paymentRoutes from './payment.routes';
import paymentMethodRoutes from './payment-method.routes';
import refundRoutes from './refund.routes';
import webhookRoutes from './webhook.routes';

const router = Router();

// Mount route modules with their respective prefixes
router.use('/payments', paymentRoutes);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/refunds', refundRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
