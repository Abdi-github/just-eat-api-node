import { DeliveryRepository } from './delivery.repository.js';
import type { IDeliveryAssignment } from './delivery.model.js';
import type {
  DeliveryResponseDto,
  AvailableDeliveriesQueryDto,
  CourierDeliveryHistoryDto,
  AdminDeliveryQueryDto,
  UpdateLocationDto,
  CancelDeliveryDto,
  AdminAssignCourierDto,
} from './delivery.types.js';
import {
  DeliveryStatus,
  DELIVERY_STATUS_TRANSITIONS,
  DELIVERY_STATUS_TIMESTAMP,
} from './delivery.types.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/AppError.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

// Import Order model for syncing
import { Order } from '../order/order.model.js';
import { Address } from '../address/address.model.js';
import { Restaurant } from '../restaurant/restaurant.model.js';

/**
 * Delivery Service
 * Business logic layer for delivery assignment management.
 * Handles delivery creation, courier assignment, status transitions,
 * location updates, and synchronization with the Order module.
 */
export class DeliveryService {
  constructor(private deliveryRepository: DeliveryRepository) {}

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
  // DELIVERY CREATION
  // ============================================================================

  /**
   * Create a delivery assignment for an order.
   * Called when a delivery order is accepted by the restaurant.
   */
  async createDeliveryForOrder(orderId: string): Promise<DeliveryResponseDto> {
    // Check if delivery already exists for this order
    const existing = await this.deliveryRepository.findByOrderId(orderId);
    if (existing) {
      throw BadRequestError('A delivery assignment already exists for this order');
    }

    // Load the order with full details
    const order = await Order.findById(orderId)
      .populate('restaurant_id', 'name slug address postal_code')
      .exec();

    if (!order) {
      throw NotFoundError('Order not found');
    }

    if (order.order_type !== 'delivery') {
      throw BadRequestError('Cannot create delivery assignment for a pickup order');
    }

    // Build restaurant pickup address
    const restaurant = order.restaurant_id as unknown as Record<string, string>;
    const pickupAddress = restaurant.address
      ? `${restaurant.name}, ${restaurant.address}`
      : restaurant.name || 'Restaurant';

    // Build delivery address snapshot from the order's delivery address
    let deliveryAddressSnapshot = {
      street: 'Unknown',
      street_number: '',
      postal_code: '',
      city: '',
    };

    if (order.delivery_address_id) {
      const address = await Address.findById(order.delivery_address_id)
        .populate('city_id', 'name')
        .lean()
        .exec();

      if (address) {
        const addr = address as Record<string, unknown>;
        const cityObj = addr.city_id as Record<string, unknown> | null;
        // City name is a TranslatedField { en, fr, de, it } — extract de as default
        const cityName = cityObj?.name as Record<string, string> | string | null;
        const resolvedCityName =
          typeof cityName === 'string' ? cityName : cityName?.de || cityName?.en || '';
        deliveryAddressSnapshot = {
          street: (addr.street as string) || 'Unknown',
          street_number: (addr.street_number as string) || '',
          postal_code: (addr.postal_code as string) || '',
          city: resolvedCityName,
          floor: (addr.floor as string) || undefined,
          instructions: (addr.instructions as string) || undefined,
        };
      }
    }

    // Create the delivery assignment
    const delivery = await this.deliveryRepository.create({
      order_id: order._id,
      restaurant_id:
        typeof order.restaurant_id === 'object'
          ? (order.restaurant_id as unknown as { _id: string })._id
          : order.restaurant_id,
      status: DeliveryStatus.PENDING,
      pickup_address: pickupAddress,
      delivery_address: deliveryAddressSnapshot,
      delivery_fee: order.delivery_fee || 0,
      estimated_delivery_at: order.estimated_delivery_at || null,
      notes: order.special_instructions || null,
    } as Partial<IDeliveryAssignment>);

    // Re-fetch with population
    const populated = await this.deliveryRepository.findById(delivery._id.toString());
    return this.toResponseDto(populated || delivery);
  }

  // ============================================================================
  // COURIER OPERATIONS
  // ============================================================================

  /**
   * Get available deliveries for couriers to browse (PENDING, no courier)
   */
  async getAvailableDeliveries(
    query: AvailableDeliveriesQueryDto
  ): Promise<{ data: DeliveryResponseDto[]; pagination: PaginationMeta }> {
    const { deliveries, pagination } = await this.deliveryRepository.findAvailable(query);
    return {
      data: deliveries.map((d) => this.toResponseDto(d)),
      pagination,
    };
  }

  /**
   * Courier accepts a delivery assignment
   */
  async acceptDelivery(deliveryId: string, user: AuthenticatedUser): Promise<DeliveryResponseDto> {
    const delivery = await this.deliveryRepository.findById(deliveryId);
    if (!delivery) {
      throw NotFoundError('Delivery assignment not found');
    }

    if (delivery.status !== DeliveryStatus.PENDING) {
      throw BadRequestError('This delivery is no longer available for acceptance');
    }

    if (delivery.courier_id) {
      throw BadRequestError('This delivery has already been assigned to a courier');
    }

    // Check courier doesn't already have an active delivery
    const activeDelivery = await this.deliveryRepository.findActiveByCourier(user.id);
    if (activeDelivery) {
      throw BadRequestError(
        'You already have an active delivery. Complete or cancel it before accepting a new one.'
      );
    }

    // Assign courier and set status to ASSIGNED
    const updated = await this.deliveryRepository.update(deliveryId, {
      courier_id: user.id as unknown as IDeliveryAssignment['courier_id'],
      status: DeliveryStatus.ASSIGNED,
      assigned_at: new Date(),
    } as Partial<IDeliveryAssignment>);

    if (!updated) {
      throw NotFoundError('Delivery assignment not found after update');
    }

    // Sync: update the order's courier_id too
    const orderId = this.extractId(delivery.order_id);
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, { courier_id: user.id });
    }

    return this.toResponseDto(updated);
  }

  /**
   * Update delivery status (courier)
   */
  async updateDeliveryStatus(
    deliveryId: string,
    newStatus: DeliveryStatus,
    user: AuthenticatedUser
  ): Promise<DeliveryResponseDto> {
    const delivery = await this.deliveryRepository.findById(deliveryId);
    if (!delivery) {
      throw NotFoundError('Delivery assignment not found');
    }

    // Only the assigned courier (or admin) can update status
    const isAssignedCourier = this.extractId(delivery.courier_id) === user.id;
    const isAdmin = user.roles.includes('super_admin') || user.roles.includes('platform_admin');

    if (!isAssignedCourier && !isAdmin) {
      throw ForbiddenError('Only the assigned courier can update delivery status');
    }

    // Validate transition
    const currentStatus = delivery.status as DeliveryStatus;
    const allowedTransitions = DELIVERY_STATUS_TRANSITIONS[currentStatus];

    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw BadRequestError(
        `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions?.join(', ') || 'none'}`
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = { status: newStatus };
    const timestampField = DELIVERY_STATUS_TIMESTAMP[newStatus];
    if (timestampField) {
      updateData[timestampField] = new Date();
    }

    const updated = await this.deliveryRepository.update(
      deliveryId,
      updateData as Partial<IDeliveryAssignment>
    );
    if (!updated) {
      throw NotFoundError('Delivery assignment not found after update');
    }

    // Sync order status for key transitions
    const orderId = this.extractId(delivery.order_id);
    if (orderId) {
      if (newStatus === DeliveryStatus.PICKED_UP) {
        await Order.findByIdAndUpdate(orderId, {
          status: 'PICKED_UP',
          picked_up_at: new Date(),
        });
      } else if (newStatus === DeliveryStatus.IN_TRANSIT) {
        await Order.findByIdAndUpdate(orderId, {
          status: 'IN_TRANSIT',
          in_transit_at: new Date(),
        });
      } else if (newStatus === DeliveryStatus.DELIVERED) {
        await Order.findByIdAndUpdate(orderId, {
          status: 'DELIVERED',
          delivered_at: new Date(),
        });
      }
    }

    return this.toResponseDto(updated);
  }

  /**
   * Update courier's live location
   */
  async updateCourierLocation(
    deliveryId: string,
    location: UpdateLocationDto,
    user: AuthenticatedUser
  ): Promise<DeliveryResponseDto> {
    const delivery = await this.deliveryRepository.findById(deliveryId);
    if (!delivery) {
      throw NotFoundError('Delivery assignment not found');
    }

    const isAssignedCourier = this.extractId(delivery.courier_id) === user.id;
    if (!isAssignedCourier) {
      throw ForbiddenError('Only the assigned courier can update location');
    }

    // Only allow location updates for active deliveries
    const activeStatuses = [
      DeliveryStatus.ASSIGNED,
      DeliveryStatus.PICKED_UP,
      DeliveryStatus.IN_TRANSIT,
    ];
    if (!activeStatuses.includes(delivery.status as DeliveryStatus)) {
      throw BadRequestError('Location updates only allowed for active deliveries');
    }

    const updated = await this.deliveryRepository.update(deliveryId, {
      courier_location: {
        lat: location.lat,
        lng: location.lng,
        updated_at: new Date(),
      },
    } as Partial<IDeliveryAssignment>);

    if (!updated) {
      throw NotFoundError('Delivery assignment not found after update');
    }

    return this.toResponseDto(updated);
  }

  /**
   * Get courier's current active delivery
   */
  async getCourierActiveDelivery(user: AuthenticatedUser): Promise<DeliveryResponseDto | null> {
    const delivery = await this.deliveryRepository.findActiveByCourier(user.id);
    if (!delivery) return null;
    return this.toResponseDto(delivery);
  }

  /**
   * Get courier's delivery history
   */
  async getCourierHistory(
    user: AuthenticatedUser,
    query: CourierDeliveryHistoryDto
  ): Promise<{ data: DeliveryResponseDto[]; pagination: PaginationMeta }> {
    const { deliveries, pagination } = await this.deliveryRepository.findCourierHistory(
      user.id,
      query
    );
    return {
      data: deliveries.map((d) => this.toResponseDto(d)),
      pagination,
    };
  }

  // ============================================================================
  // CUSTOMER OPERATIONS
  // ============================================================================

  /**
   * Track delivery for an order (customer)
   */
  async trackDelivery(orderId: string, user: AuthenticatedUser): Promise<DeliveryResponseDto> {
    // Verify order ownership
    const order = await Order.findById(orderId).lean().exec();
    if (!order) {
      throw NotFoundError('Order not found');
    }

    const orderUserId = this.extractId((order as Record<string, unknown>).user_id);
    const isOwner = orderUserId === user.id;
    const isAdmin = user.roles.includes('super_admin') || user.roles.includes('platform_admin');

    if (!isOwner && !isAdmin) {
      throw ForbiddenError('You do not have access to this delivery');
    }

    const delivery = await this.deliveryRepository.findByOrderId(orderId);
    if (!delivery) {
      throw NotFoundError('No delivery assignment found for this order');
    }

    return this.toResponseDto(delivery);
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  /**
   * List all deliveries (admin)
   */
  async getAllDeliveries(
    query: AdminDeliveryQueryDto
  ): Promise<{ data: DeliveryResponseDto[]; pagination: PaginationMeta }> {
    const { deliveries, pagination } = await this.deliveryRepository.findAll(query);
    return {
      data: deliveries.map((d) => this.toResponseDto(d)),
      pagination,
    };
  }

  /**
   * Get delivery by ID (admin)
   */
  async getDeliveryById(deliveryId: string): Promise<DeliveryResponseDto> {
    const delivery = await this.deliveryRepository.findById(deliveryId);
    if (!delivery) {
      throw NotFoundError('Delivery assignment not found');
    }
    return this.toResponseDto(delivery);
  }

  /**
   * Admin manually assign courier to delivery
   */
  async adminAssignCourier(
    deliveryId: string,
    dto: AdminAssignCourierDto
  ): Promise<DeliveryResponseDto> {
    const delivery = await this.deliveryRepository.findById(deliveryId);
    if (!delivery) {
      throw NotFoundError('Delivery assignment not found');
    }

    if (delivery.status !== DeliveryStatus.PENDING) {
      throw BadRequestError(
        `Cannot assign courier when delivery is in ${delivery.status} status. Must be PENDING.`
      );
    }

    const updated = await this.deliveryRepository.update(deliveryId, {
      courier_id: dto.courier_id as unknown as IDeliveryAssignment['courier_id'],
      status: DeliveryStatus.ASSIGNED,
      assigned_at: new Date(),
    } as Partial<IDeliveryAssignment>);

    if (!updated) {
      throw NotFoundError('Delivery assignment not found after update');
    }

    // Sync order courier_id
    const orderId = this.extractId(delivery.order_id);
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, { courier_id: dto.courier_id });
    }

    return this.toResponseDto(updated);
  }

  /**
   * Admin cancel a delivery
   */
  async adminCancelDelivery(
    deliveryId: string,
    dto: CancelDeliveryDto
  ): Promise<DeliveryResponseDto> {
    const delivery = await this.deliveryRepository.findById(deliveryId);
    if (!delivery) {
      throw NotFoundError('Delivery assignment not found');
    }

    const terminalStatuses = [
      DeliveryStatus.DELIVERED,
      DeliveryStatus.CANCELLED,
      DeliveryStatus.FAILED,
    ];
    if (terminalStatuses.includes(delivery.status as DeliveryStatus)) {
      throw BadRequestError(`Cannot cancel a delivery in ${delivery.status} status`);
    }

    const updated = await this.deliveryRepository.update(deliveryId, {
      status: DeliveryStatus.CANCELLED,
      cancelled_at: new Date(),
      cancellation_reason: dto.reason || null,
    } as Partial<IDeliveryAssignment>);

    if (!updated) {
      throw NotFoundError('Delivery assignment not found after update');
    }

    // Unassign courier from order
    const orderId = this.extractId(delivery.order_id);
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, { courier_id: null });
    }

    return this.toResponseDto(updated);
  }

  // ============================================================================
  // RESPONSE MAPPING
  // ============================================================================

  private toResponseDto(delivery: IDeliveryAssignment): DeliveryResponseDto {
    const doc = delivery as unknown as Record<string, unknown>;

    // Extract populated order fields
    const orderObj = doc.order_id as Record<string, unknown> | null;
    const orderNumber = orderObj?.order_number as string | undefined;

    // Extract populated restaurant fields
    const restObj = doc.restaurant_id as Record<string, unknown> | null;
    const restaurantName = restObj?.name as string | undefined;
    const restaurantAddress = restObj?.address as string | undefined;

    return {
      id: (doc._id || doc.id)?.toString() || '',
      order_id: this.extractId(doc.order_id) || '',
      order_number: orderNumber,
      restaurant_id: this.extractId(doc.restaurant_id) || '',
      restaurant_name: restaurantName,
      restaurant_address: restaurantAddress,
      courier_id: this.extractId(doc.courier_id),
      status: doc.status as string,
      pickup_address: doc.pickup_address as string,
      delivery_address: doc.delivery_address as DeliveryResponseDto['delivery_address'],
      delivery_fee: doc.delivery_fee as number,
      distance_km: (doc.distance_km as number) || null,
      estimated_pickup_at: doc.estimated_pickup_at
        ? (doc.estimated_pickup_at as Date).toISOString?.() || String(doc.estimated_pickup_at)
        : null,
      estimated_delivery_at: doc.estimated_delivery_at
        ? (doc.estimated_delivery_at as Date).toISOString?.() || String(doc.estimated_delivery_at)
        : null,
      assigned_at: doc.assigned_at
        ? (doc.assigned_at as Date).toISOString?.() || String(doc.assigned_at)
        : null,
      picked_up_at: doc.picked_up_at
        ? (doc.picked_up_at as Date).toISOString?.() || String(doc.picked_up_at)
        : null,
      in_transit_at: doc.in_transit_at
        ? (doc.in_transit_at as Date).toISOString?.() || String(doc.in_transit_at)
        : null,
      delivered_at: doc.delivered_at
        ? (doc.delivered_at as Date).toISOString?.() || String(doc.delivered_at)
        : null,
      cancelled_at: doc.cancelled_at
        ? (doc.cancelled_at as Date).toISOString?.() || String(doc.cancelled_at)
        : null,
      cancellation_reason: (doc.cancellation_reason as string) || null,
      courier_location: doc.courier_location as DeliveryResponseDto['courier_location'],
      notes: (doc.notes as string) || null,
      created_at: doc.created_at
        ? (doc.created_at as Date).toISOString?.() || String(doc.created_at)
        : new Date().toISOString(),
      updated_at: doc.updated_at
        ? (doc.updated_at as Date).toISOString?.() || String(doc.updated_at)
        : new Date().toISOString(),
    };
  }
}
