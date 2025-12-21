import { Router } from 'express';

import orderCourierRoutes from '../../../modules/order/order.courier.routes.js';
import deliveryCourierRoutes from '../../../modules/delivery/delivery.courier.routes.js';

const router = Router();

// Order/delivery routes: /api/v1/courier/orders/*
router.use('/orders', orderCourierRoutes);

// Delivery routes: /api/v1/courier/deliveries/*
router.use('/deliveries', deliveryCourierRoutes);

export default router;
