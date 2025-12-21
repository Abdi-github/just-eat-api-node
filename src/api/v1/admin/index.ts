import { Router } from 'express';

import userAdminRoutes from '../../../modules/user/user.admin.routes.js';
import locationAdminRoutes from '../../../modules/location/location.admin.routes.js';
import cuisineAdminRoutes from '../../../modules/cuisine/cuisine.admin.routes.js';
import brandAdminRoutes from '../../../modules/brand/brand.admin.routes.js';
import restaurantAdminRoutes from '../../../modules/restaurant/restaurant.admin.routes.js';
import orderAdminRoutes from '../../../modules/order/order.admin.routes.js';
import paymentAdminRoutes from '../../../modules/payment/payment.admin.routes.js';
import deliveryAdminRoutes from '../../../modules/delivery/delivery.admin.routes.js';
import reviewAdminRoutes from '../../../modules/review/review.admin.routes.js';
import promotionAdminRoutes from '../../../modules/promotion/promotion.admin.routes.js';
import notificationAdminRoutes from '../../../modules/notification/notification.admin.routes.js';
import analyticsAdminRoutes from '../../../modules/analytics/analytics.admin.routes.js';
import applicationAdminRoutes from '../../../modules/auth/application.admin.routes.js';

const router = Router();

// User management: /api/v1/admin/users/*
router.use('/users', userAdminRoutes);

// Location management: /api/v1/admin/locations/cantons/* and /api/v1/admin/locations/cities/*
router.use('/locations', locationAdminRoutes);

// Cuisine management: /api/v1/admin/cuisines/*
router.use('/cuisines', cuisineAdminRoutes);

// Brand management: /api/v1/admin/brands/*
router.use('/brands', brandAdminRoutes);

// Restaurant management: /api/v1/admin/restaurants/*
router.use('/restaurants', restaurantAdminRoutes);

// Order management: /api/v1/admin/orders/*
router.use('/orders', orderAdminRoutes);

// Payment management: /api/v1/admin/payments/*
router.use('/payments', paymentAdminRoutes);

// Delivery management: /api/v1/admin/deliveries/*
router.use('/deliveries', deliveryAdminRoutes);

// Review moderation: /api/v1/admin/reviews/*
router.use('/reviews', reviewAdminRoutes);

// Promotion management: /api/v1/admin/promotions/*
router.use('/promotions', promotionAdminRoutes);

// Notification management: /api/v1/admin/notifications/*
router.use('/notifications', notificationAdminRoutes);

// Analytics: /api/v1/admin/analytics/*
router.use('/analytics', analyticsAdminRoutes);

// Application management: /api/v1/admin/applications/*
router.use('/applications', applicationAdminRoutes);

export default router;
