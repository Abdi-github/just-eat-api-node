import { Request, Response } from 'express';
import { DeliveryService } from './delivery.service.js';
import { DeliveryRepository } from './delivery.repository.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse, sendPaginatedResponse } from '../../shared/utils/response.helper.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { DeliveryStatus } from './delivery.types.js';

const deliveryRepository = new DeliveryRepository();
const deliveryService = new DeliveryService(deliveryRepository);

// ============================================================================
// COURIER ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/courier/deliveries/available
 * List available deliveries for couriers to accept
 */
const getAvailableDeliveries = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.getAvailableDeliveries(req.query as Record<string, string>);
  sendPaginatedResponse(
    res,
    200,
    'Available deliveries retrieved successfully',
    result.data,
    result.pagination
  );
});

/**
 * POST /api/v1/courier/deliveries/:id/accept
 * Accept a delivery assignment
 */
const acceptDelivery = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await deliveryService.acceptDelivery(req.params.id, user);
  sendSuccessResponse(res, 200, 'Delivery accepted successfully', result);
});

/**
 * PATCH /api/v1/courier/deliveries/:id/status
 * Update delivery status (PICKED_UP, IN_TRANSIT, DELIVERED)
 */
const updateDeliveryStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await deliveryService.updateDeliveryStatus(
    req.params.id,
    req.body.status as DeliveryStatus,
    user
  );
  sendSuccessResponse(res, 200, 'Delivery status updated successfully', result);
});

/**
 * PATCH /api/v1/courier/deliveries/:id/location
 * Update courier's live location
 */
const updateLocation = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await deliveryService.updateCourierLocation(req.params.id, req.body, user);
  sendSuccessResponse(res, 200, 'Location updated successfully', result);
});

/**
 * GET /api/v1/courier/deliveries/active
 * Get courier's current active delivery
 */
const getActiveDelivery = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await deliveryService.getCourierActiveDelivery(user);
  sendSuccessResponse(
    res,
    200,
    result ? 'Active delivery retrieved' : 'No active delivery',
    result
  );
});

/**
 * GET /api/v1/courier/deliveries/history
 * Get courier's delivery history
 */
const getDeliveryHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await deliveryService.getCourierHistory(user, req.query as Record<string, string>);
  sendPaginatedResponse(
    res,
    200,
    'Delivery history retrieved successfully',
    result.data,
    result.pagination
  );
});

// ============================================================================
// CUSTOMER ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/public/deliveries/:orderId/track
 * Track delivery status for an order (customer)
 */
const trackDelivery = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: AuthenticatedUser }).user;
  const result = await deliveryService.trackDelivery(req.params.orderId, user);
  sendSuccessResponse(res, 200, 'Delivery tracking retrieved successfully', result);
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/admin/deliveries
 * List all deliveries (admin)
 */
const adminGetAllDeliveries = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.getAllDeliveries(req.query as Record<string, string>);
  sendPaginatedResponse(
    res,
    200,
    'Deliveries retrieved successfully',
    result.data,
    result.pagination
  );
});

/**
 * GET /api/v1/admin/deliveries/:id
 * Get delivery details (admin)
 */
const adminGetDeliveryById = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.getDeliveryById(req.params.id);
  sendSuccessResponse(res, 200, 'Delivery retrieved successfully', result);
});

/**
 * POST /api/v1/admin/deliveries/:id/assign
 * Manually assign courier to delivery (admin)
 */
const adminAssignCourier = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.adminAssignCourier(req.params.id, req.body);
  sendSuccessResponse(res, 200, 'Courier assigned successfully', result);
});

/**
 * POST /api/v1/admin/deliveries/:id/cancel
 * Cancel a delivery (admin)
 */
const adminCancelDelivery = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.adminCancelDelivery(req.params.id, req.body);
  sendSuccessResponse(res, 200, 'Delivery cancelled successfully', result);
});

/**
 * POST /api/v1/admin/deliveries/create
 * Create delivery assignment for an order (admin)
 */
const adminCreateDelivery = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.createDeliveryForOrder(req.body.order_id);
  sendSuccessResponse(res, 201, 'Delivery assignment created successfully', result);
});

// ============================================================================
// EXPORT
// ============================================================================

export const deliveryController = {
  // Courier
  getAvailableDeliveries,
  acceptDelivery,
  updateDeliveryStatus,
  updateLocation,
  getActiveDelivery,
  getDeliveryHistory,
  // Customer
  trackDelivery,
  // Admin
  adminGetAllDeliveries,
  adminGetDeliveryById,
  adminAssignCourier,
  adminCancelDelivery,
  adminCreateDelivery,
};
