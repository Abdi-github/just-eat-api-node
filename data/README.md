# Seed Data

This directory contains **21 JSON seed files** that populate the Just Eat Clone database with realistic Swiss food delivery data.

## Quick Start

```bash
# Seed from Docker
npm run docker:seed

# Reset & re-seed
npm run docker:seed:reset
```

## Data Files

### Core Platform

| File | Records | Description |
|------|---------|-------------|
| `users.json` | 80 | Platform users (admins, owners, couriers, customers) |
| `roles.json` | 7 | Role definitions (super_admin → customer) |
| `user_roles.json` | 80 | User-to-role assignments |
| `permissions.json` | 71 | Granular permission definitions |
| `role_permissions.json` | 86 | Role-to-permission mappings |

### Geography (Swiss)

| File | Records | Description |
|------|---------|-------------|
| `cantons.json` | 5 | Swiss cantons (ZH, BE, VD, GE, BS) |
| `cities.json` | 6 | Swiss cities with multilingual names (DE/EN/FR/IT) |

### Restaurants

| File | Records | Description |
|------|---------|-------------|
| `restaurants.json` | 380 | Full restaurant data (name, address, rating, delivery info) |
| `brands.json` | 18 | Restaurant chain brands |
| `cuisines.json` | 46 | Cuisine types with 4-language translations |
| `restaurant_cuisines.json` | 335 | Restaurant-to-cuisine mappings |
| `opening_hours.json` | 14 | Restaurant opening hours |
| `delivery_zones.json` | 3 | Delivery zone definitions |

### Menus

| File | Records | Description |
|------|---------|-------------|
| `menu_categories.json` | 1,490 | Menu category groups (Starters, Mains, Drinks, etc.) |
| `menu_items.json` | 4,235 | Individual menu items with prices (CHF) |

### Customer Data

| File | Records | Description |
|------|---------|-------------|
| `addresses.json` | 5 | Customer delivery addresses |
| `favorites.json` | 6 | Customer favorite restaurants |
| `orders.json` | 4,495 | Historical orders with full item details |
| `reviews.json` | 4,495 | Customer reviews with ratings (1–5) |

### Image Mappings (Internal)

| File | Description |
|------|-------------|
| `_image_mapping.json` | Maps restaurant/menu item IDs to Cloudinary image URLs |
| `_cover_image_mapping.json` | Maps restaurant IDs to Cloudinary cover image URLs |

## Data Summary

| Metric | Count |
|--------|-------|
| **Total records** | ~15,900+ |
| **Restaurants** | 380 |
| **Menu items** | 4,235 |
| **Orders** | 4,495 |
| **Reviews** | 4,495 |
| **Users** | 80 |
| **Cuisines** | 46 |
| **Brands** | 18 |
| **Menu categories** | 1,490 |

## Data Characteristics

- **Swiss context**: CHF prices, Swiss addresses, Swiss city/canton names
- **Multilingual**: Cuisine names, city names in DE/EN/FR/IT
- **Realistic ratings**: 1–5 star reviews with realistic distribution
- **Image support**: Cloudinary URLs for restaurant logos, covers, and menu item images
- **Relational integrity**: All foreign key references are valid across files
- **Scraped origin**: Restaurant data sourced from real just-eat.ch/eat.ch listings, transformed and anonymized

## Notes

- Files prefixed with `_` are internal mappings (not directly seeded as collections)
- The seed script in `scripts/seed.ts` handles insertion order to maintain referential integrity
- Run `npm run docker:seed:reset` to drop and re-create all data
