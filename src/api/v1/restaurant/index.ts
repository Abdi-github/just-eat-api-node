import { Router } from 'express';

import restaurantOwnerRoutes from '../../../modules/restaurant/restaurant.restaurant.routes.js';
import menuRestaurantRoutes from '../../../modules/menu/menu.restaurant.routes.js';
import orderRestaurantRoutes from '../../../modules/order/order.restaurant.routes.js';
import reviewRestaurantRoutes from '../../../modules/review/review.restaurant.routes.js';
import promotionRestaurantRoutes from '../../../modules/promotion/promotion.restaurant.routes.js';
import analyticsRestaurantRoutes from '../../../modules/analytics/analytics.restaurant.routes.js';

const router = Router();

// Restaurant owner/staff management routes
router.use('/', restaurantOwnerRoutes);

// Menu management routes: /api/v1/restaurant/:restaurantId/menu/*
router.use('/:restaurantId/menu', menuRestaurantRoutes);

// Order management routes: /api/v1/restaurant/:restaurantId/orders/*
router.use('/:restaurantId/orders', orderRestaurantRoutes);

// Review management routes: /api/v1/restaurant/:restaurantId/reviews/*
router.use('/:restaurantId/reviews', reviewRestaurantRoutes);

// Promotion management routes: /api/v1/restaurant/:restaurantId/promotions/*
router.use('/:restaurantId/promotions', promotionRestaurantRoutes);

// Analytics routes: /api/v1/restaurant/:restaurantId/analytics/*
router.use('/:restaurantId/analytics', analyticsRestaurantRoutes);

export default router;
