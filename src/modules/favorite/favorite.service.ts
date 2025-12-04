import { FavoriteRepository } from './favorite.repository.js';
import { Restaurant } from '../restaurant/restaurant.model.js';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError.js';
import type { FavoriteResponseDto, ToggleFavoriteResponseDto } from './favorite.types.js';
import type { IFavorite } from './favorite.model.js';

/**
 * Favorite Service
 *
 * Business logic for managing user favorite restaurants.
 * Supports toggle (add/remove), list, and check operations.
 */
export class FavoriteService {
  constructor(private favoriteRepository: FavoriteRepository) {}

  /**
   * Toggle a restaurant in user's favorites.
   * If already favorited → remove. If not → add.
   */
  async toggleFavorite(userId: string, restaurantId: string): Promise<ToggleFavoriteResponseDto> {
    // Validate restaurant exists and is published
    const restaurant = await Restaurant.findById(restaurantId)
      .select('_id name slug status')
      .exec();
    if (!restaurant) {
      throw NotFoundError('Restaurant not found');
    }
    if (restaurant.status !== 'PUBLISHED') {
      throw BadRequestError('Cannot favorite a restaurant that is not published');
    }

    // Check if already favorited
    const existing = await this.favoriteRepository.findByUserAndRestaurant(userId, restaurantId);

    if (existing) {
      // Remove favorite
      await this.favoriteRepository.deleteByUserAndRestaurant(userId, restaurantId);
      return { is_favorited: false, favorite: null };
    }

    // Add favorite
    const favorite = await this.favoriteRepository.create({
      user_id: userId,
      restaurant_id: restaurantId,
    });

    // Fetch with populated restaurant for response
    const populated = await this.favoriteRepository.findByUser(userId, 1, 1);
    const fav = populated.data.find((f) => f._id.toString() === favorite._id.toString());

    return {
      is_favorited: true,
      favorite: fav ? this.toResponseDto(fav) : null,
    };
  }

  /**
   * Get all favorites for a user (paginated)
   */
  async getUserFavorites(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ data: FavoriteResponseDto[]; total: number }> {
    const result = await this.favoriteRepository.findByUser(userId, page, limit);

    return {
      data: result.data.map((f) => this.toResponseDto(f)),
      total: result.total,
    };
  }

  /**
   * Check if a user has favorited a specific restaurant
   */
  async checkFavorite(userId: string, restaurantId: string): Promise<{ is_favorited: boolean }> {
    const isFavorited = await this.favoriteRepository.isFavorited(userId, restaurantId);
    return { is_favorited: isFavorited };
  }

  /**
   * Remove a specific favorite by restaurant_id
   */
  async removeFavorite(userId: string, restaurantId: string): Promise<void> {
    const existing = await this.favoriteRepository.findByUserAndRestaurant(userId, restaurantId);
    if (!existing) {
      throw NotFoundError('Favorite not found');
    }

    await this.favoriteRepository.deleteByUserAndRestaurant(userId, restaurantId);
  }

  /**
   * Map a favorite document to a response DTO
   */
  private toResponseDto(favorite: IFavorite): FavoriteResponseDto {
    const restaurant = favorite.restaurant_id as unknown as Record<string, unknown>;
    const isPopulated = restaurant && typeof restaurant === 'object' && '_id' in restaurant;

    return {
      id: favorite._id.toString(),
      user_id: favorite.user_id.toString(),
      restaurant: isPopulated
        ? {
            id: (restaurant._id as { toString(): string }).toString(),
            name: (restaurant.name as string) || '',
            slug: (restaurant.slug as string) || '',
            logo_url: (restaurant.logo_url as string) || null,
            cover_image_url: (restaurant.cover_image_url as string) || null,
            rating: (restaurant.rating as number) || 0,
            review_count: (restaurant.review_count as number) || 0,
            delivery_fee: (restaurant.delivery_fee as number) ?? null,
            estimated_delivery_minutes:
              (restaurant.estimated_delivery_minutes as { min: number; max: number }) || null,
            supports_delivery: (restaurant.supports_delivery as boolean) ?? false,
            supports_pickup: (restaurant.supports_pickup as boolean) ?? false,
            is_active: (restaurant.is_active as boolean) ?? false,
          }
        : null,
      created_at: favorite.created_at,
    };
  }
}
