import { DeliveryAssignment, IDeliveryAssignment } from './delivery.model.js';
import type {
  AvailableDeliveriesQueryDto,
  CourierDeliveryHistoryDto,
  AdminDeliveryQueryDto,
  DeliveryStatus,
} from './delivery.types.js';
import { DELIVERY_CONSTANTS } from './delivery.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import { calculatePaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Delivery Repository
 * Data access layer for delivery assignment operations.
 */
export class DeliveryRepository {
  // ==================== CREATE ====================

  async create(data: Partial<IDeliveryAssignment>): Promise<IDeliveryAssignment> {
    const delivery = new DeliveryAssignment(data);
    return delivery.save();
  }

  // ==================== FIND ====================

  async findById(id: string): Promise<IDeliveryAssignment | null> {
    return DeliveryAssignment.findById(id)
      .populate('order_id', 'order_number status total payment_method payment_status items')
      .populate('restaurant_id', 'name slug logo_url address phone')
      .populate('courier_id', 'first_name last_name phone email')
      .lean()
      .exec() as Promise<IDeliveryAssignment | null>;
  }

  async findByOrderId(orderId: string): Promise<IDeliveryAssignment | null> {
    return DeliveryAssignment.findOne({ order_id: orderId })
      .populate('order_id', 'order_number status total payment_method payment_status items')
      .populate('restaurant_id', 'name slug logo_url address phone')
      .populate('courier_id', 'first_name last_name phone email')
      .lean()
      .exec() as Promise<IDeliveryAssignment | null>;
  }

  // ==================== AVAILABLE DELIVERIES (Courier Pool) ====================

  async findAvailable(
    query: AvailableDeliveriesQueryDto
  ): Promise<{ deliveries: IDeliveryAssignment[]; pagination: PaginationMeta }> {
    const { page = 1, limit = DELIVERY_CONSTANTS.DEFAULT_LIMIT, city, postal_code } = query;

    const filter: Record<string, unknown> = {
      status: 'PENDING',
      courier_id: null,
    };

    if (postal_code) {
      filter['delivery_address.postal_code'] = postal_code;
    }
    if (city) {
      filter['delivery_address.city'] = { $regex: new RegExp(city, 'i') };
    }

    const [deliveries, total] = await Promise.all([
      DeliveryAssignment.find(filter)
        .sort('-created_at')
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('order_id', 'order_number total items')
        .populate('restaurant_id', 'name slug logo_url address')
        .lean()
        .exec(),
      DeliveryAssignment.countDocuments(filter),
    ]);

    const pagination = calculatePaginationMeta(page, limit, total);
    return { deliveries: deliveries as IDeliveryAssignment[], pagination };
  }

  // ==================== COURIER QUERIES ====================

  async findActiveByCourier(courierId: string): Promise<IDeliveryAssignment | null> {
    return DeliveryAssignment.findOne({
      courier_id: courierId,
      status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
    })
      .populate(
        'order_id',
        'order_number status total payment_method payment_status items user_id special_instructions'
      )
      .populate('restaurant_id', 'name slug logo_url address phone')
      .lean()
      .exec() as Promise<IDeliveryAssignment | null>;
  }

  async findCourierHistory(
    courierId: string,
    query: CourierDeliveryHistoryDto
  ): Promise<{ deliveries: IDeliveryAssignment[]; pagination: PaginationMeta }> {
    const {
      page = 1,
      limit = DELIVERY_CONSTANTS.DEFAULT_LIMIT,
      sort = DELIVERY_CONSTANTS.DEFAULT_SORT,
      status,
      date_from,
      date_to,
    } = query;

    const filter: Record<string, unknown> = { courier_id: courierId };
    if (status) filter.status = status;
    if (date_from || date_to) {
      const dateFilter: Record<string, Date> = {};
      if (date_from) dateFilter.$gte = new Date(date_from);
      if (date_to) dateFilter.$lte = new Date(date_to);
      filter.created_at = dateFilter;
    }

    const [deliveries, total] = await Promise.all([
      DeliveryAssignment.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('order_id', 'order_number total')
        .populate('restaurant_id', 'name slug')
        .lean()
        .exec(),
      DeliveryAssignment.countDocuments(filter),
    ]);

    const pagination = calculatePaginationMeta(page, limit, total);
    return { deliveries: deliveries as IDeliveryAssignment[], pagination };
  }

  // ==================== ADMIN QUERIES ====================

  async findAll(
    query: AdminDeliveryQueryDto
  ): Promise<{ deliveries: IDeliveryAssignment[]; pagination: PaginationMeta }> {
    const {
      page = 1,
      limit = DELIVERY_CONSTANTS.DEFAULT_LIMIT,
      sort = DELIVERY_CONSTANTS.DEFAULT_SORT,
      status,
      courier_id,
      restaurant_id,
      date_from,
      date_to,
    } = query;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (courier_id) filter.courier_id = courier_id;
    if (restaurant_id) filter.restaurant_id = restaurant_id;
    if (date_from || date_to) {
      const dateFilter: Record<string, Date> = {};
      if (date_from) dateFilter.$gte = new Date(date_from);
      if (date_to) dateFilter.$lte = new Date(date_to);
      filter.created_at = dateFilter;
    }

    const [deliveries, total] = await Promise.all([
      DeliveryAssignment.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('order_id', 'order_number status total payment_method')
        .populate('restaurant_id', 'name slug')
        .populate('courier_id', 'first_name last_name email')
        .lean()
        .exec(),
      DeliveryAssignment.countDocuments(filter),
    ]);

    const pagination = calculatePaginationMeta(page, limit, total);
    return { deliveries: deliveries as IDeliveryAssignment[], pagination };
  }

  // ==================== UPDATE ====================

  async update(
    id: string,
    data: Partial<IDeliveryAssignment>
  ): Promise<IDeliveryAssignment | null> {
    return DeliveryAssignment.findByIdAndUpdate(id, data, { returnDocument: 'after' })
      .populate('order_id', 'order_number status total payment_method payment_status items')
      .populate('restaurant_id', 'name slug logo_url address phone')
      .populate('courier_id', 'first_name last_name phone email')
      .lean()
      .exec() as Promise<IDeliveryAssignment | null>;
  }

  async updateByOrderId(
    orderId: string,
    data: Partial<IDeliveryAssignment>
  ): Promise<IDeliveryAssignment | null> {
    return DeliveryAssignment.findOneAndUpdate({ order_id: orderId }, data, {
      returnDocument: 'after',
    })
      .lean()
      .exec() as Promise<IDeliveryAssignment | null>;
  }

  // ==================== STATS ====================

  async countByCourierAndStatus(courierId: string, status: string): Promise<number> {
    return DeliveryAssignment.countDocuments({ courier_id: courierId, status });
  }

  async countByStatus(status: string): Promise<number> {
    return DeliveryAssignment.countDocuments({ status });
  }
}
