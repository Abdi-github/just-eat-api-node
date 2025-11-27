import { OrderRepository } from './order.repository.js';
import type { IOrder } from './order.model.js';
import type {
  OrderCreateDto,
  OrderStatusUpdateDto,
  OrderQueryDto,
  RestaurantOrderQueryDto,
  AdminOrderQueryDto,
  OrderItemStored,
  OrderResponseDto,
} from './order.types.js';
import {
  OrderStatus,
  OrderType,
  PaymentStatus,
  ORDER_STATUS_TRANSITIONS,
  STATUS_TIMESTAMP_FIELD,
  STATUS_ALLOWED_ROLES,
  ORDER_CONSTANTS,
} from './order.types.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger/index.js';
import {
  enqueueOrderPlacedEmail,
  enqueueOrderStatusEmail,
  enqueueNewOrderRestaurantEmail,
} from '../../shared/queue/index.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

// Import models for validation lookups
import { Restaurant } from '../restaurant/restaurant.model.js';
import { MenuItem } from '../menu/menu-item.model.js';
import { Address } from '../address/address.model.js';
import { User } from '../user/user.model.js';

/**
 * Order Service
 * Business logic layer for order management.
 * Handles order creation, status transitions, validation, and authorization.
 */
export class OrderService {
  constructor(private orderRepository: OrderRepository) {}

  /**
   * Extract string ID from a field that may be populated or an ObjectId
   */
  private extractId(field: unknown): string | null {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field !== null) {
      const obj = field as Record<string, unknown>;
      if (obj._id) return obj._id.toString();
    }
    return field.toString();
  }

  // ============================================================================
  // ORDER CREATION
  // ============================================================================

  /**
   * Place a new order (customer)
   */
  async placeOrder(dto: OrderCreateDto, user: AuthenticatedUser): Promise<OrderResponseDto> {
    // 1. Validate restaurant exists and is active/published
    const restaurant = await Restaurant.findById(dto.restaurant_id)
      .select(
        'name status is_active supports_delivery supports_pickup delivery_fee minimum_order estimated_delivery_minutes'
      )
      .lean()
      .exec();

    if (!restaurant) {
      throw NotFoundError('Restaurant not found');
    }
    if (restaurant.status !== 'PUBLISHED') {
      throw BadRequestError('Restaurant is not currently accepting orders');
    }
    if (restaurant.is_active === false) {
      throw BadRequestError('Restaurant is currently inactive');
    }

    // 2. Validate order type is supported
    if (dto.order_type === OrderType.DELIVERY && restaurant.supports_delivery === false) {
      throw BadRequestError('This restaurant does not support delivery');
    }
    if (dto.order_type === OrderType.PICKUP && restaurant.supports_pickup === false) {
      throw BadRequestError('This restaurant does not support pickup');
    }

    // 3. Validate delivery address for delivery orders
    if (dto.order_type === OrderType.DELIVERY) {
      if (!dto.delivery_address_id) {
        throw BadRequestError('Delivery address is required for delivery orders');
      }
      const address = await Address.findOne({
        _id: dto.delivery_address_id,
        user_id: user.id,
      })
        .lean()
        .exec();
      if (!address) {
        throw NotFoundError('Delivery address not found or does not belong to you');
      }
    }

    // 4. Validate menu items and snapshot prices
    const menuItemIds = dto.items.map((item) => item.menu_item_id);
    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      restaurant_id: dto.restaurant_id,
    })
      .lean()
      .exec();

    if (menuItems.length !== menuItemIds.length) {
      throw BadRequestError(
        'One or more menu items are invalid or do not belong to this restaurant'
      );
    }

    // Check availability
    const unavailableItems = menuItems.filter((item) => item.is_available === false);
    if (unavailableItems.length > 0) {
      const names = unavailableItems.map((i) => i.name?.de || i.name?.en || 'Unknown');
      throw BadRequestError(`The following items are currently unavailable: ${names.join(', ')}`);
    }

    // Build order items with snapshotted prices
    const menuItemMap = new Map(menuItems.map((item) => [item._id.toString(), item]));
    const orderItems: OrderItemStored[] = dto.items.map((item) => {
      const menuItem = menuItemMap.get(item.menu_item_id)!;
      const unitPrice = menuItem.price;
      const optionsTotal = (item.options || []).reduce((sum, opt) => sum + opt.price, 0);
      const totalPrice = (unitPrice + optionsTotal) * item.quantity;

      return {
        menu_item_id: item.menu_item_id,
        name: menuItem.name?.de || menuItem.name?.en || 'Unknown',
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: Math.round(totalPrice * 100) / 100,
        special_instructions: item.special_instructions || null,
        options: item.options,
      };
    });

    // 5. Calculate totals
    const subtotal =
      Math.round(orderItems.reduce((sum, item) => sum + item.total_price, 0) * 100) / 100;

    const deliveryFee = dto.order_type === OrderType.DELIVERY ? (restaurant.delivery_fee ?? 0) : 0;

    const serviceFee = ORDER_CONSTANTS.DEFAULT_SERVICE_FEE;
    const tip = Math.round((dto.tip || 0) * 100) / 100;
    const discount = 0; // Handled by promotion module later

    // Validate minimum order for delivery
    if (dto.order_type === OrderType.DELIVERY && restaurant.minimum_order) {
      if (subtotal < restaurant.minimum_order) {
        throw BadRequestError(
          `Minimum order amount for delivery is CHF ${restaurant.minimum_order}. Your subtotal is CHF ${subtotal}.`
        );
      }
    }

    const total = Math.round((subtotal + deliveryFee + serviceFee + tip - discount) * 100) / 100;

    // 6. Generate order number
    const orderNumber = await this.orderRepository.generateOrderNumber();

    // 7. Calculate estimated delivery time
    let estimatedDeliveryAt: Date | null = null;
    if (dto.order_type === OrderType.DELIVERY && restaurant.estimated_delivery_minutes) {
      const avgMinutes = Math.round(
        (restaurant.estimated_delivery_minutes.min + restaurant.estimated_delivery_minutes.max) / 2
      );
      estimatedDeliveryAt = new Date(Date.now() + avgMinutes * 60 * 1000);
    }

    // 8. Create the order
    const order = await this.orderRepository.create({
      order_number: orderNumber,
      user_id: user.id as unknown as IOrder['user_id'],
      restaurant_id: dto.restaurant_id as unknown as IOrder['restaurant_id'],
      courier_id: null,
      delivery_address_id:
        dto.order_type === OrderType.DELIVERY
          ? (dto.delivery_address_id as unknown as IOrder['delivery_address_id'])
          : null,
      order_type: dto.order_type as IOrder['order_type'],
      status: OrderStatus.PLACED as IOrder['status'],
      items: orderItems as IOrder['items'],
      subtotal,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      tip,
      discount,
      total,
      currency: 'CHF',
      payment_method: dto.payment_method as IOrder['payment_method'],
      payment_status: PaymentStatus.PENDING as IOrder['payment_status'],
      special_instructions: dto.special_instructions || null,
      estimated_delivery_at: estimatedDeliveryAt,
      placed_at: new Date(),
    } as Partial<IOrder>);

    // Send order emails via queue (fire-and-forget)
    this.sendOrderPlacedNotifications(user.id, orderNumber, restaurant.name, total).catch(
      (err) => {
        logger.error('Failed to send order placed notifications', {
          orderNumber,
          error: (err as Error).message,
        });
      }
    );

    return this.toResponseDto(order);
  }

  // ============================================================================
  // ORDER STATUS UPDATES
  // ============================================================================

  /**
   * Update order status with validation of transitions and roles
   */
  async updateStatus(
    orderId: string,
    dto: OrderStatusUpdateDto,
    user: AuthenticatedUser
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw NotFoundError('Order not found');
    }

    const currentStatus = order.status as OrderStatus;
    const newStatus = dto.status;

    // Validate status transition
    const validTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];
    if (!validTransitions || !validTransitions.includes(newStatus)) {
      throw BadRequestError(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }

    // Validate role authorization for this transition
    const allowedRoles = STATUS_ALLOWED_ROLES[newStatus];
    if (allowedRoles) {
      const hasRole = user.roles.some((role) => allowedRoles.includes(role));
      if (!hasRole) {
        throw ForbiddenError(`Your role does not allow transitioning orders to ${newStatus}`);
      }
    }

    // Role-specific ownership validation
    await this.validateOwnership(order, user, newStatus);

    // Validate required fields for specific transitions
    if (newStatus === OrderStatus.REJECTED && !dto.rejection_reason) {
      throw BadRequestError('Rejection reason is required when rejecting an order');
    }
    if (newStatus === OrderStatus.CANCELLED && !dto.cancellation_reason) {
      throw BadRequestError('Cancellation reason is required');
    }

    // Build additional fields
    const additionalFields: Record<string, unknown> = {};
    if (newStatus === OrderStatus.REJECTED) {
      additionalFields.rejection_reason = dto.rejection_reason;
    }
    if (newStatus === OrderStatus.CANCELLED) {
      additionalFields.cancellation_reason = dto.cancellation_reason;
    }

    // Get the timestamp field for the new status
    const timestampField = STATUS_TIMESTAMP_FIELD[newStatus] || 'updated_at';

    const updatedOrder = await this.orderRepository.updateStatus(
      orderId,
      newStatus,
      timestampField,
      additionalFields
    );

    if (!updatedOrder) {
      throw NotFoundError('Order not found after update');
    }

    // Send order status update email via queue (fire-and-forget)
    const restaurantName = await this.getRestaurantName(order.restaurant_id);
    this.sendOrderStatusNotification(
      this.extractId(order.user_id) || '',
      order.order_number,
      newStatus,
      restaurantName
    ).catch((err) => {
      logger.error('Failed to send order status notification', {
        orderId,
        newStatus,
        error: (err as Error).message,
      });
    });

    return this.toResponseDto(updatedOrder);
  }

  /**
   * Cancel an order (customer only — before PREPARING)
   */
  async cancelOrder(
    orderId: string,
    reason: string,
    user: AuthenticatedUser
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw NotFoundError('Order not found');
    }

    // Customer can only cancel their own orders
    if (this.extractId(order.user_id) !== user.id && !user.roles.includes('super_admin')) {
      throw ForbiddenError('You can only cancel your own orders');
    }

    // Can only cancel before PREPARING
    const cancellableStatuses: OrderStatus[] = [OrderStatus.PLACED, OrderStatus.ACCEPTED];
    if (!cancellableStatuses.includes(order.status as OrderStatus)) {
      throw BadRequestError(
        `Order cannot be cancelled in ${order.status} status. Cancellation is only allowed before preparation begins.`
      );
    }

    const updatedOrder = await this.orderRepository.updateStatus(
      orderId,
      OrderStatus.CANCELLED,
      'cancelled_at',
      { cancellation_reason: reason }
    );

    if (!updatedOrder) {
      throw NotFoundError('Order not found after cancellation');
    }

    // Send cancellation notification via queue (fire-and-forget)
    const cancelRestaurantName = await this.getRestaurantName(order.restaurant_id);
    this.sendOrderStatusNotification(
      this.extractId(order.user_id) || '',
      order.order_number,
      OrderStatus.CANCELLED,
      cancelRestaurantName
    ).catch((err) => {
      logger.error('Failed to send cancellation notification', {
        orderId,
        error: (err as Error).message,
      });
    });

    return this.toResponseDto(updatedOrder);
  }

  // ============================================================================
  // COURIER OPERATIONS
  // ============================================================================

  /**
   * Assign a courier to an order
   */
  async assignCourier(
    orderId: string,
    courierId: string,
    user: AuthenticatedUser
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw NotFoundError('Order not found');
    }

    if (order.order_type !== OrderType.DELIVERY) {
      throw BadRequestError('Cannot assign courier to a pickup order');
    }

    // Restaurant owners/staff can assign couriers, or admins
    const isAdmin = user.roles.includes('super_admin') || user.roles.includes('platform_admin');
    const isRestaurantOwner =
      user.roles.includes('restaurant_owner') &&
      this.extractId(order.restaurant_id) === user.restaurantId;

    if (!isAdmin && !isRestaurantOwner) {
      throw ForbiddenError('You do not have permission to assign couriers to this order');
    }

    const updatedOrder = await this.orderRepository.assignCourier(orderId, courierId);
    if (!updatedOrder) {
      throw NotFoundError('Order not found after courier assignment');
    }

    return this.toResponseDto(updatedOrder);
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get customer's own orders
   */
  async getMyOrders(
    user: AuthenticatedUser,
    query: OrderQueryDto
  ): Promise<{ data: OrderResponseDto[]; pagination: PaginationMeta }> {
    const { orders, pagination } = await this.orderRepository.findByUser(user.id, query);
    return {
      data: orders.map((order) => this.toResponseDto(order)),
      pagination,
    };
  }

  /**
   * Get a specific order by ID (with authorization checks)
   */
  async getOrderById(orderId: string, user: AuthenticatedUser): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw NotFoundError('Order not found');
    }

    // Authorization: who can see this order?
    const isOwner = this.extractId(order.user_id) === user.id;
    const isCourier =
      user.roles.includes('courier') && this.extractId(order.courier_id) === user.id;
    const isRestaurantOwner =
      user.roles.includes('restaurant_owner') &&
      this.extractId(order.restaurant_id) === user.restaurantId;
    const isAdmin = user.roles.includes('super_admin') || user.roles.includes('platform_admin');

    if (!isOwner && !isCourier && !isRestaurantOwner && !isAdmin) {
      throw ForbiddenError('You do not have access to this order');
    }

    return this.toResponseDto(order);
  }

  /**
   * Get restaurant orders (for restaurant owner/staff)
   */
  async getRestaurantOrders(
    restaurantId: string,
    query: RestaurantOrderQueryDto,
    user: AuthenticatedUser
  ): Promise<{ data: OrderResponseDto[]; pagination: PaginationMeta }> {
    // Validate restaurant ownership
    const isAdmin = user.roles.includes('super_admin') || user.roles.includes('platform_admin');

    if (!isAdmin && user.restaurantId !== restaurantId) {
      throw ForbiddenError('You can only view orders for your own restaurant');
    }

    const { orders, pagination } = await this.orderRepository.findByRestaurant(restaurantId, query);
    return {
      data: orders.map((order) => this.toResponseDto(order)),
      pagination,
    };
  }

  /**
   * Get active orders for a restaurant (real-time dashboard)
   */
  async getActiveRestaurantOrders(
    restaurantId: string,
    user: AuthenticatedUser
  ): Promise<OrderResponseDto[]> {
    const isAdmin = user.roles.includes('super_admin') || user.roles.includes('platform_admin');

    if (!isAdmin && user.restaurantId !== restaurantId) {
      throw ForbiddenError('You can only view orders for your own restaurant');
    }

    const orders = await this.orderRepository.findActiveByRestaurant(restaurantId);
    return orders.map((order) => this.toResponseDto(order));
  }

  /**
   * Get courier's assigned deliveries
   */
  async getCourierOrders(
    user: AuthenticatedUser,
    query: OrderQueryDto
  ): Promise<{ data: OrderResponseDto[]; pagination: PaginationMeta }> {
    const { orders, pagination } = await this.orderRepository.findByCourier(user.id, query);
    return {
      data: orders.map((order) => this.toResponseDto(order)),
      pagination,
    };
  }

  /**
   * Get courier's active deliveries
   */
  async getCourierActiveDeliveries(user: AuthenticatedUser): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.findActiveByCourier(user.id);
    return orders.map((order) => this.toResponseDto(order));
  }

  /**
   * Get all orders (admin)
   */
  async getAllOrders(
    query: AdminOrderQueryDto
  ): Promise<{ data: OrderResponseDto[]; pagination: PaginationMeta }> {
    const { orders, pagination } = await this.orderRepository.findAll(query);
    return {
      data: orders.map((order) => this.toResponseDto(order)),
      pagination,
    };
  }

  /**
   * Get order by order number (admin)
   */
  async getOrderByNumber(orderNumber: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findByOrderNumber(orderNumber);
    if (!order) {
      throw NotFoundError('Order not found');
    }
    return this.toResponseDto(order);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Validate that the user has ownership access for the status transition
   */
  private async validateOwnership(
    order: IOrder,
    user: AuthenticatedUser,
    newStatus: OrderStatus
  ): Promise<void> {
    const isAdmin = user.roles.includes('super_admin');
    if (isAdmin) return; // super_admin can do anything

    switch (newStatus) {
      case OrderStatus.ACCEPTED:
      case OrderStatus.REJECTED:
      case OrderStatus.PREPARING:
      case OrderStatus.READY: {
        // Restaurant owner/staff — must own or be staff of the restaurant
        const isOwner =
          user.roles.includes('restaurant_owner') &&
          this.extractId(order.restaurant_id) === user.restaurantId;
        const isStaff =
          user.roles.includes('restaurant_staff') &&
          this.extractId(order.restaurant_id) === user.restaurantId;
        if (!isOwner && !isStaff) {
          throw ForbiddenError('You can only manage orders for your own restaurant');
        }
        break;
      }

      case OrderStatus.PICKED_UP:
      case OrderStatus.IN_TRANSIT: {
        // Courier — must be assigned to this order
        if (!user.roles.includes('courier')) {
          throw ForbiddenError('Only couriers can update delivery status');
        }
        if (this.extractId(order.courier_id) !== user.id) {
          throw ForbiddenError('You are not assigned to this delivery');
        }
        break;
      }

      case OrderStatus.DELIVERED: {
        // Courier (for delivery) or restaurant staff (for pickup)
        if (order.order_type === OrderType.DELIVERY) {
          if (
            this.extractId(order.courier_id) !== user.id &&
            !user.roles.includes('restaurant_owner')
          ) {
            throw ForbiddenError('Only the assigned courier can mark delivery orders as delivered');
          }
        } else {
          // Pickup — restaurant owner/staff
          const isOwner =
            user.roles.includes('restaurant_owner') &&
            this.extractId(order.restaurant_id) === user.restaurantId;
          const isStaff =
            user.roles.includes('restaurant_staff') &&
            this.extractId(order.restaurant_id) === user.restaurantId;
          if (!isOwner && !isStaff) {
            throw ForbiddenError('Only restaurant staff can mark pickup orders as delivered');
          }
        }
        break;
      }

      case OrderStatus.CANCELLED: {
        // Customer — must own the order
        if (this.extractId(order.user_id) !== user.id) {
          throw ForbiddenError('You can only cancel your own orders');
        }
        break;
      }
    }
  }

  // ============================================================================
  // NOTIFICATION HELPERS
  // ============================================================================

  /**
   * Get restaurant name from a restaurant_id (may be populated or ObjectId)
   */
  private async getRestaurantName(restaurantId: unknown): Promise<string> {
    // If populated
    if (typeof restaurantId === 'object' && restaurantId !== null) {
      const obj = restaurantId as Record<string, unknown>;
      if (obj.name && typeof obj.name === 'string') return obj.name;
    }

    // If ObjectId string, look up
    const id = this.extractId(restaurantId);
    if (!id) return 'Restaurant';

    try {
      const restaurant = await Restaurant.findById(id).select('name').lean().exec();
      return restaurant?.name || 'Restaurant';
    } catch {
      return 'Restaurant';
    }
  }

  /**
   * Send order placed notifications: email to customer + email to restaurant
   */
  private async sendOrderPlacedNotifications(
    userId: string,
    orderNumber: string,
    restaurantName: string,
    total: number
  ): Promise<void> {
    // 1. Send order placed email to customer
    try {
      const customer = await User.findById(userId).select('email first_name').lean().exec();
      if (customer?.email) {
        await enqueueOrderPlacedEmail(
          customer.email,
          customer.first_name || 'Customer',
          orderNumber,
          restaurantName,
          total
        );
      }
    } catch (err) {
      logger.error('Failed to enqueue order placed email to customer', {
        userId,
        orderNumber,
        error: (err as Error).message,
      });
    }

    // 2. Send new order notification to restaurant
    try {
      const restaurantDoc = await Restaurant.findOne({ name: restaurantName })
        .select('owner_id')
        .lean()
        .exec();
      if (restaurantDoc?.owner_id) {
        const owner = await User.findById(restaurantDoc.owner_id)
          .select('email')
          .lean()
          .exec();
        if (owner?.email) {
          await enqueueNewOrderRestaurantEmail(owner.email, restaurantName, orderNumber, total);
        }
      }
    } catch (err) {
      logger.error('Failed to enqueue new order email to restaurant', {
        orderNumber,
        restaurantName,
        error: (err as Error).message,
      });
    }

    // 3. Create in-app notification via NotificationService
    try {
      const { notificationService } = await import(
        '../notification/notification.controller.js'
      );
      await notificationService.notifyOrderStatus(
        userId,
        orderNumber,
        'PLACED',
        restaurantName,
        { total }
      );
    } catch (err) {
      logger.error('Failed to create order placed notification', {
        userId,
        orderNumber,
        error: (err as Error).message,
      });
    }
  }

  /**
   * Send order status update notification + email
   */
  private async sendOrderStatusNotification(
    userId: string,
    orderNumber: string,
    status: string,
    restaurantName: string
  ): Promise<void> {
    // 1. Send status update email to customer
    try {
      const customer = await User.findById(userId).select('email first_name').lean().exec();
      if (customer?.email) {
        await enqueueOrderStatusEmail(
          customer.email,
          customer.first_name || 'Customer',
          orderNumber,
          status,
          restaurantName
        );
      }
    } catch (err) {
      logger.error('Failed to enqueue order status email', {
        userId,
        orderNumber,
        status,
        error: (err as Error).message,
      });
    }

    // 2. Create in-app notification via NotificationService
    try {
      const { notificationService } = await import(
        '../notification/notification.controller.js'
      );
      await notificationService.notifyOrderStatus(userId, orderNumber, status, restaurantName);
    } catch (err) {
      logger.error('Failed to create order status notification', {
        userId,
        orderNumber,
        status,
        error: (err as Error).message,
      });
    }
  }

  /**
   * Convert an IOrder document to a response DTO
   */
  private toResponseDto(order: IOrder): OrderResponseDto {
    const restaurantName =
      typeof order.restaurant_id === 'object' && order.restaurant_id !== null
        ? (order.restaurant_id as unknown as { name?: string }).name || undefined
        : undefined;

    return {
      id: order._id.toString(),
      order_number: order.order_number,
      user_id: this.extractId(order.user_id) || '',
      restaurant_id: this.extractId(order.restaurant_id) || '',
      restaurant_name: restaurantName,
      courier_id: this.extractId(order.courier_id),
      delivery_address_id: this.extractId(order.delivery_address_id),
      order_type: order.order_type,
      status: order.status,
      items: (order.items || []).map((item) => ({
        menu_item_id: item.menu_item_id?.toString(),
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        special_instructions: item.special_instructions || null,
        options: item.options,
      })),
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      service_fee: order.service_fee,
      tip: order.tip,
      discount: order.discount,
      total: order.total,
      currency: order.currency,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      special_instructions: order.special_instructions || null,
      estimated_delivery_at:
        order.estimated_delivery_at?.toISOString?.() ||
        (order.estimated_delivery_at as unknown as string) ||
        null,
      placed_at: order.placed_at?.toISOString?.() || (order.placed_at as unknown as string),
      accepted_at:
        order.accepted_at?.toISOString?.() || (order.accepted_at as unknown as string) || null,
      rejected_at:
        order.rejected_at?.toISOString?.() || (order.rejected_at as unknown as string) || null,
      rejection_reason: order.rejection_reason || null,
      preparing_at:
        order.preparing_at?.toISOString?.() || (order.preparing_at as unknown as string) || null,
      ready_at: order.ready_at?.toISOString?.() || (order.ready_at as unknown as string) || null,
      picked_up_at:
        order.picked_up_at?.toISOString?.() || (order.picked_up_at as unknown as string) || null,
      in_transit_at:
        order.in_transit_at?.toISOString?.() || (order.in_transit_at as unknown as string) || null,
      delivered_at:
        order.delivered_at?.toISOString?.() || (order.delivered_at as unknown as string) || null,
      cancelled_at:
        order.cancelled_at?.toISOString?.() || (order.cancelled_at as unknown as string) || null,
      cancellation_reason: order.cancellation_reason || null,
      created_at: order.created_at?.toISOString?.() || (order.created_at as unknown as string),
      updated_at: order.updated_at?.toISOString?.() || (order.updated_at as unknown as string),
    };
  }
}

// Singleton instance
import orderRepository from './order.repository.js';

export const orderService = new OrderService(orderRepository);
export default orderService;
