import { Request, Response } from 'express';

import { asyncHandler } from '../../shared/errors/errorHandler.js';
import {
  sendSuccessResponse,
  sendPaginatedResponse,
  parsePaginationParams,
} from '../../shared/utils/response.helper.js';
import { orderService } from './order.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type {
  OrderCreateDto,
  OrderStatusUpdateDto,
  OrderQueryDto,
  RestaurantOrderQueryDto,
  AdminOrderQueryDto,
} from './order.types.js';

/**
 * Order Controller
 * Thin controller — delegates all business logic to OrderService.
 */
class OrderController {
  // ============================================================================
  // CUSTOMER ENDPOINTS
  // ============================================================================

  /**
   * Place a new order
   * POST /api/v1/public/orders
   */
  placeOrder = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const dto: OrderCreateDto = req.body;

    const order = await orderService.placeOrder(dto, user);
    sendSuccessResponse(res, 201, 'Order placed successfully', order);
  });

  /**
   * Get customer's own orders
   * GET /api/v1/public/orders/my
   */
  getMyOrders = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { page, limit } = parsePaginationParams(req.query as Record<string, string>);
    const query: OrderQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || '-created_at',
      status: req.query.status as OrderQueryDto['status'],
      order_type: req.query.order_type as OrderQueryDto['order_type'],
    };

    const { data, pagination } = await orderService.getMyOrders(user, query);
    sendPaginatedResponse(res, 200, 'Orders retrieved successfully', data, pagination);
  });

  /**
   * Get a specific order by ID (customer view)
   * GET /api/v1/public/orders/:id
   */
  getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const order = await orderService.getOrderById(req.params.id, user);
    sendSuccessResponse(res, 200, 'Order retrieved successfully', order);
  });

  /**
   * Cancel an order
   * PATCH /api/v1/public/orders/:id/cancel
   */
  cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { cancellation_reason } = req.body;

    const order = await orderService.cancelOrder(req.params.id, cancellation_reason, user);
    sendSuccessResponse(res, 200, 'Order cancelled successfully', order);
  });

  // ============================================================================
  // RESTAURANT ENDPOINTS
  // ============================================================================

  /**
   * Get restaurant's orders
   * GET /api/v1/restaurant/:restaurantId/orders
   */
  getRestaurantOrders = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId } = req.params;
    const { page, limit } = parsePaginationParams(req.query as Record<string, string>);

    const query: RestaurantOrderQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || '-created_at',
      status: req.query.status as RestaurantOrderQueryDto['status'],
      order_type: req.query.order_type as RestaurantOrderQueryDto['order_type'],
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
    };

    const { data, pagination } = await orderService.getRestaurantOrders(restaurantId, query, user);
    sendPaginatedResponse(res, 200, 'Restaurant orders retrieved successfully', data, pagination);
  });

  /**
   * Get active orders for a restaurant (real-time dashboard)
   * GET /api/v1/restaurant/:restaurantId/orders/active
   */
  getActiveRestaurantOrders = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { restaurantId } = req.params;

    const orders = await orderService.getActiveRestaurantOrders(restaurantId, user);
    sendSuccessResponse(res, 200, 'Active orders retrieved successfully', orders);
  });

  /**
   * Update order status (restaurant owner/staff)
   * PATCH /api/v1/restaurant/:restaurantId/orders/:id/status
   */
  updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const dto: OrderStatusUpdateDto = req.body;

    const order = await orderService.updateStatus(req.params.id, dto, user);
    sendSuccessResponse(res, 200, 'Order status updated successfully', order);
  });

  /**
   * Assign a courier to an order
   * PATCH /api/v1/restaurant/:restaurantId/orders/:id/assign-courier
   */
  assignCourier = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { courier_id } = req.body;

    const order = await orderService.assignCourier(req.params.id, courier_id, user);
    sendSuccessResponse(res, 200, 'Courier assigned successfully', order);
  });

  // ============================================================================
  // COURIER ENDPOINTS
  // ============================================================================

  /**
   * Get courier's assigned orders
   * GET /api/v1/courier/orders
   */
  getCourierOrders = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const { page, limit } = parsePaginationParams(req.query as Record<string, string>);
    const query: OrderQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || '-created_at',
      status: req.query.status as OrderQueryDto['status'],
    };

    const { data, pagination } = await orderService.getCourierOrders(user, query);
    sendPaginatedResponse(res, 200, 'Courier orders retrieved successfully', data, pagination);
  });

  /**
   * Get courier's active deliveries
   * GET /api/v1/courier/orders/active
   */
  getCourierActiveDeliveries = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const orders = await orderService.getCourierActiveDeliveries(user);
    sendSuccessResponse(res, 200, 'Active deliveries retrieved successfully', orders);
  });

  /**
   * Update delivery status (courier)
   * PATCH /api/v1/courier/orders/:id/status
   */
  updateDeliveryStatus = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const dto: OrderStatusUpdateDto = req.body;

    const order = await orderService.updateStatus(req.params.id, dto, user);
    sendSuccessResponse(res, 200, 'Delivery status updated successfully', order);
  });

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  /**
   * Get all orders (admin)
   * GET /api/v1/admin/orders
   */
  getAllOrders = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationParams(req.query as Record<string, string>);
    const query: AdminOrderQueryDto = {
      page,
      limit,
      sort: (req.query.sort as string) || '-created_at',
      status: req.query.status as AdminOrderQueryDto['status'],
      order_type: req.query.order_type as AdminOrderQueryDto['order_type'],
      payment_method: req.query.payment_method as AdminOrderQueryDto['payment_method'],
      payment_status: req.query.payment_status as AdminOrderQueryDto['payment_status'],
      restaurant_id: req.query.restaurant_id as string,
      user_id: req.query.user_id as string,
      courier_id: req.query.courier_id as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      order_number: req.query.order_number as string,
    };

    const { data, pagination } = await orderService.getAllOrders(query);
    sendPaginatedResponse(res, 200, 'All orders retrieved successfully', data, pagination);
  });

  /**
   * Get order by ID (admin — no ownership check)
   * GET /api/v1/admin/orders/:id
   */
  getOrderByIdAdmin = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const order = await orderService.getOrderById(req.params.id, user);
    sendSuccessResponse(res, 200, 'Order retrieved successfully', order);
  });

  /**
   * Update order status (admin)
   * PATCH /api/v1/admin/orders/:id/status
   */
  updateOrderStatusAdmin = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as unknown as { user: AuthenticatedUser }).user;
    const dto: OrderStatusUpdateDto = req.body;

    const order = await orderService.updateStatus(req.params.id, dto, user);
    sendSuccessResponse(res, 200, 'Order status updated successfully', order);
  });
}

export const orderController = new OrderController();
export default orderController;
