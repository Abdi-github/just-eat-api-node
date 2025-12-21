import { Router } from 'express';

import authRoutes from '../../../modules/auth/auth.routes.js';
import userRoutes from '../../../modules/user/user.routes.js';
import cantonRoutes from '../../../modules/location/location.routes.js';
import cityRoutes from '../../../modules/location/location.city.routes.js';
import cuisineRoutes from '../../../modules/cuisine/cuisine.routes.js';
import brandRoutes from '../../../modules/brand/brand.routes.js';
import restaurantRoutes from '../../../modules/restaurant/restaurant.routes.js';
import addressRoutes from '../../../modules/address/address.routes.js';
import searchRoutes from '../../../modules/search/search.routes.js';
import orderPublicRoutes from '../../../modules/order/order.public.routes.js';
import paymentPublicRoutes from '../../../modules/payment/payment.public.routes.js';
import deliveryPublicRoutes from '../../../modules/delivery/delivery.public.routes.js';
import reviewPublicRoutes from '../../../modules/review/review.public.routes.js';
import favoriteRoutes from '../../../modules/favorite/favorite.routes.js';
import promotionPublicRoutes from '../../../modules/promotion/promotion.public.routes.js';
import notificationRoutes from '../../../modules/notification/notification.routes.js';

const router = Router();

// Auth routes: /api/v1/public/auth/*
router.use('/auth', authRoutes);

// User routes: /api/v1/public/users/*
router.use('/users', userRoutes);

// Location routes: /api/v1/public/locations/cantons/* and /api/v1/public/locations/cities/*
router.use('/locations/cantons', cantonRoutes);
router.use('/locations/cities', cityRoutes);

// Cuisine routes: /api/v1/public/cuisines/*
router.use('/cuisines', cuisineRoutes);

// Brand routes: /api/v1/public/brands/*
router.use('/brands', brandRoutes);

// Restaurant routes: /api/v1/public/restaurants/*
router.use('/restaurants', restaurantRoutes);

// Address routes: /api/v1/public/addresses/*
router.use('/addresses', addressRoutes);

// Search routes: /api/v1/public/search/*
router.use('/search', searchRoutes);

// Order routes: /api/v1/public/orders/*
router.use('/orders', orderPublicRoutes);

// Payment routes: /api/v1/public/payments/*
router.use('/payments', paymentPublicRoutes);

// Delivery tracking: /api/v1/public/deliveries/*
router.use('/deliveries', deliveryPublicRoutes);

// Review routes: /api/v1/public/reviews/*
router.use('/reviews', reviewPublicRoutes);

// Favorite routes: /api/v1/public/favorites/*
router.use('/favorites', favoriteRoutes);

// Promotion routes: /api/v1/public/promotions/*
router.use('/promotions', promotionPublicRoutes);

// Notification routes: /api/v1/public/notifications/*
router.use('/notifications', notificationRoutes);

export default router;
