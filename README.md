# Just Eat Clone API

REST API backend for a Swiss food delivery platform (just-eat.ch clone), built with Node.js, Express 5, TypeScript, and MongoDB.

## Overview

| Metric | Value |
|--------|-------|
| **Modules** | 19 domain modules (incl. application system) |
| **Endpoints** | 126+ REST API endpoints |
| **Source Files** | 200+ TypeScript files |
| **Seed Data** | 21 JSON files (380 restaurants, 46 cuisines, 4,235 menu items, 4,495 orders/reviews, 80 users) |
| **Languages** | 4 (EN, FR, DE, IT) |
| **Test Coverage** | Unit + Integration + RBAC + i18n tests |

## Tech Stack

| Area | Technology |
|------|-----------|
| Runtime | Node.js 20+ (ESM) |
| Framework | Express 5 |
| Language | TypeScript 5.9 (strict) |
| Database | MongoDB 7.0 / Mongoose 9 |
| Cache | Redis / ioredis |
| Auth | JWT (access + refresh tokens) |
| RBAC | Roles + Permissions (7 roles, 65 permissions) |
| Validation | express-validator |
| i18n | i18next (EN, FR, DE, IT) |
| Logging | Winston |
| Email | Nodemailer + Mailpit (dev) |
| Payments | Stripe + TWINT (sandbox) + PostFinance (sandbox) + Cash |
| Real-time | Socket.io |
| Images | Sharp + Cloudinary |
| Containers | Docker + Docker Compose |
| Testing | Jest + Supertest |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development without Docker)

### Start with Docker (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd just-eat-api-node

# Copy environment file
cp .env.example .env

# Start all services (API, MongoDB, Redis, Mailpit, Mongo Express, Redis Commander)
npm run docker:dev

# Seed the database
npm run docker:seed

# API is now running at http://localhost:4005
```

### Docker Services

| Service | Port | URL |
|---------|------|-----|
| **API** | 4005 | http://localhost:4005 |
| **MongoDB** | 27022 | `mongodb://localhost:27022` |
| **Redis** | 6383 | `redis://localhost:6383` |
| **Mongo Express** | 8086 | http://localhost:8086 |
| **Redis Commander** | 8087 | http://localhost:8087 |
| **Mailpit** | 8025 / 1025 | http://localhost:8025 |

### Verify Installation

```bash
# Health check
curl http://localhost:4005/health

# Login as admin
curl -X POST http://localhost:4005/api/v1/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@justeat-clone.ch","password":"Password123!"}'

# Browse restaurants (German, default)
curl http://localhost:4005/api/v1/public/restaurants?limit=5

# Browse restaurants (French)
curl http://localhost:4005/api/v1/public/restaurants?limit=5&lang=fr
```

## Project Structure

```
src/
├── api/v1/
│   ├── public/           # Public routes (no auth)
│   ├── admin/            # Platform admin routes (12 modules)
│   ├── restaurant/       # Restaurant owner/staff routes
│   └── courier/          # Courier routes
├── modules/
│   ├── auth/             # Authentication (JWT, refresh tokens, email verification)
│   ├── user/             # User profiles, admin user management
│   ├── location/         # Cantons & cities (Swiss geography)
│   ├── cuisine/          # Cuisine types (46 types, 4 languages)
│   ├── brand/            # Restaurant chain brands
│   ├── restaurant/       # Restaurant CRUD, approval workflow
│   ├── menu/             # Menu categories & items
│   ├── address/          # Customer delivery addresses
│   ├── search/           # Restaurant & menu search engine
│   ├── order/            # Order lifecycle (8 statuses)
│   ├── payment/          # 4 payment providers (Strategy Pattern)
│   ├── delivery/         # Delivery assignments & tracking
│   ├── review/           # Ratings, reviews, moderation
│   ├── favorite/         # Customer favorites
│   ├── promotion/        # Coupons & stamp cards
│   ├── notification/     # In-app + email notifications
│   ├── analytics/        # Platform & restaurant dashboards
│   ├── admin/            # RBAC models (roles, permissions)
│   └── (application)     # Application system (in auth module: register-restaurant, register-courier)
├── shared/
│   ├── auth/             # JWT & RBAC middleware
│   ├── cache/            # Redis cache utilities
│   ├── errors/           # AppError, error codes, error handler
│   ├── i18n/             # i18next setup + 4 language locales
│   ├── logger/           # Winston logger
│   ├── middlewares/       # Rate limiter, validation, sanitization, upload
│   ├── services/         # Email, image optimization (Sharp), Cloudinary
│   └── utils/            # Response helpers, pagination, slug generator
├── config/               # Database, Redis, environment config
├── app.ts                # Express app configuration
└── server.ts             # Server entry point
```

### Module Structure

Each module follows a strict contract:

```
{module}/
├── {module}.model.ts               # Mongoose schema
├── {module}.routes.ts               # Route definitions
├── {module}.controller.ts           # Thin controller (no business logic)
├── {module}.service.ts              # Business logic layer
├── {module}.repository.ts           # Data access layer
├── {module}.validator.ts            # express-validator rules
├── {module}.types.ts                # TypeScript interfaces
├── {module}.dto.ts                  # Data Transfer Objects
├── {MODULE}_DOCUMENTATION.md        # API documentation
└── index.ts                         # Barrel export
```

## API Routes

### Public Routes (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/public/auth/register` | Register new customer |
| `POST` | `/public/auth/login` | Login (returns JWT tokens) |
| `POST` | `/public/auth/refresh` | Refresh access token |
| `GET` | `/public/restaurants` | List restaurants with filters |
| `GET` | `/public/restaurants/:slug` | Get restaurant by slug |
| `GET` | `/public/restaurants/:id/menu` | Get restaurant menu |
| `GET` | `/public/cuisines` | List all cuisines |
| `GET` | `/public/brands` | List all brands |
| `GET` | `/public/locations/cantons` | List cantons |
| `GET` | `/public/locations/cities` | List cities |
| `GET` | `/public/search/restaurants` | Search restaurants |
| `POST` | `/public/auth/register-restaurant` | Apply as restaurant owner |
| `POST` | `/public/auth/register-courier` | Apply as courier |
| `GET` | `/public/auth/application-status` | Get application status (auth) |
| `GET` | `/public/restaurants/cursor` | List restaurants (cursor pagination) |

### Customer Routes (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/public/orders` | Place an order |
| `GET` | `/public/orders/my` | Get my orders |
| `POST` | `/public/reviews` | Create a review |
| `POST` | `/public/favorites/toggle` | Toggle favorite restaurant |
| `GET` | `/public/addresses` | Get my addresses |
| `POST` | `/public/users/avatar` | Upload own avatar |
| `DELETE` | `/public/users/avatar` | Remove own avatar |

### Restaurant Owner Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/restaurant/orders` | Get incoming orders |
| `PATCH` | `/restaurant/orders/:id/status` | Accept/reject/update order |
| `POST` | `/restaurant/menu/categories` | Create menu category |
| `POST` | `/restaurant/menu/items` | Create menu item |
| `POST` | `/restaurant/:id/logo` | Upload restaurant logo |
| `DELETE` | `/restaurant/:id/logo` | Remove restaurant logo |
| `POST` | `/restaurant/:id/cover-image` | Upload restaurant cover image |
| `DELETE` | `/restaurant/:id/cover-image` | Remove restaurant cover image |
| `POST` | `/restaurant/:rid/menu/items/:iid/image` | Upload menu item image |
| `DELETE` | `/restaurant/:rid/menu/items/:iid/image` | Remove menu item image |
| `GET` | `/restaurant/analytics/dashboard` | Restaurant analytics |

### Admin Routes (60+ Endpoints)

| Module | Endpoints | Description |
|--------|-----------|-------------|
| Users | 10 | Full user lifecycle + role management |
| Locations | 6 | Canton & city CRUD |
| Cuisines | 3 | Cuisine CRUD |
| Brands | 3 | Brand CRUD |
| Brands Images | 2 | Brand logo upload/delete |
| Restaurants | 6 | Approval workflow + management |
| Orders | 3 | Order oversight + status overrides |
| Payments | 3 | Transaction viewer + refunds |
| Deliveries | 5 | Assignment + courier management |
| Reviews | 4 | Moderation queue |
| Promotions | 10 | Coupons + stamp cards CRUD |
| Notifications | 1 | Send to users |
| Analytics | 3 | Platform dashboards |
| Applications | 3 | Application review, approve/reject |

## Authentication & Authorization

### Roles (7)

| Role | Description |
|------|-------------|
| `super_admin` | Full system control |
| `platform_admin` | Moderate restaurants, reviews, manage content |
| `support_agent` | Handle customer issues, process refunds |
| `restaurant_owner` | Manage own restaurant, menu, orders |
| `restaurant_staff` | Process orders, update availability |
| `courier` | Accept deliveries, update status |
| `customer` | Browse, order, review |

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@justeat-clone.ch` | `Password123!` |
| Restaurant Owner | `owner.bigburger@example.ch` | `Password123!` |
| Customer | `customer1@example.ch` | `Password123!` |
| Courier | `courier1@justeat-clone.ch` | `Password123!` |

## Payment System

4 payment providers following the **Strategy Pattern**:

| Provider | Mode | Description |
|----------|------|-------------|
| **Stripe** | Test keys | Credit/debit cards (Visa, Mastercard, Amex) |
| **TWINT** | Sandbox | Switzerland's #1 mobile payment |
| **PostFinance** | Sandbox | Swiss national bank payment |
| **Cash** | Full | Cash on delivery |

## Order Lifecycle

```
PLACED → ACCEPTED → PREPARING → READY → PICKED_UP → IN_TRANSIT → DELIVERED
  ↘ REJECTED                                    (customer) ↗ CANCELLED
```

## Multilingual Support

All user-facing content supports 4 languages (EN, FR, DE, IT):

- Cuisine names, city names, canton names
- Menu item names & descriptions
- Restaurant descriptions
- API error messages & validation messages
- Notification titles & bodies

**Language resolution:** `?lang=` → `x-language` header → cookie → `Accept-Language` → default (`de`)

## Scripts

```bash
# Development
npm run docker:dev          # Start all Docker services (dev)
npm run docker:dev:down     # Stop all Docker services
npm run docker:logs         # View API logs
npm run docker:seed         # Seed database
npm run docker:seed:reset   # Reset & re-seed database

# Production
npm run docker:prod         # Build & start production containers
npm run docker:prod:down    # Stop production containers
npm run docker:prod:logs    # View production API logs

# Code Quality
npm run lint                # ESLint check
npm run lint:fix            # ESLint auto-fix
npm run format              # Prettier format
npm run format:check        # Prettier check
npm run typecheck           # TypeScript type check

# Testing
npm run test                # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report

# Build
npm run build               # TypeScript compilation + copy i18n assets
npm run start               # Production start
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to `main` and `develop`:

1. **Lint & Format** — ESLint + Prettier
2. **TypeScript Check** — `tsc --noEmit`
3. **Build** — Compile + verify dist output
4. **Tests** — Jest with MongoDB + Redis service containers
5. **Docker Build** — Production image build (main branch only)

## Documentation

### Module Documentation

Each module has its own `*_DOCUMENTATION.md` with full endpoint reference, request/response examples, and business rules:

- [Auth](src/modules/auth/AUTH_DOCUMENTATION.md)
- [User](src/modules/user/USER_DOCUMENTATION.md)
- [Location](src/modules/location/LOCATION_DOCUMENTATION.md)
- [Cuisine](src/modules/cuisine/CUISINE_DOCUMENTATION.md)
- [Brand](src/modules/brand/BRAND_DOCUMENTATION.md)
- [Restaurant](src/modules/restaurant/RESTAURANT_DOCUMENTATION.md)
- [Menu](src/modules/menu/MENU_DOCUMENTATION.md)
- [Address](src/modules/address/ADDRESS_DOCUMENTATION.md)
- [Search](src/modules/search/SEARCH_DOCUMENTATION.md)
- [Order](src/modules/order/ORDER_DOCUMENTATION.md)
- [Payment](src/modules/payment/PAYMENT_DOCUMENTATION.md)
- [Delivery](src/modules/delivery/DELIVERY_DOCUMENTATION.md)
- [Review](src/modules/review/REVIEW_DOCUMENTATION.md)
- [Favorite](src/modules/favorite/FAVORITE_DOCUMENTATION.md)
- [Promotion](src/modules/promotion/PROMOTION_DOCUMENTATION.md)
- [Notification](src/modules/notification/NOTIFICATION_DOCUMENTATION.md)
- [Analytics](src/modules/analytics/ANALYTICS_DOCUMENTATION.md)
- [Admin](src/modules/admin/ADMIN_DOCUMENTATION.md)

### Other Documentation

- [Docker Setup](docs/DOCKER_DOCUMENTATION.md)
- [Image Management](docs/IMAGE_MANAGEMENT_DOCUMENTATION.md)
- [Payment Integration Guide](docs/PAYMENT_INTEGRATION_GUIDE.md)

### Postman Collections

Import the main collection and environment into Postman:

- **Main Collection:** `postman/justeat.postman_collection.json` (18 folders, 126+ requests)
- **Environment:** `postman/postman_environment.json`
- **Standalone Collections:** Individual module collections in `postman/` directory

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server
NODE_ENV=development
PORT=4005
API_PREFIX=/api/v1

# Database
MONGODB_URI=mongodb://root:password@mongodb:27017/justeat_dev?authSource=admin

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Email (Mailpit for dev)
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_FROM=noreply@justeat-clone.ch

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# TWINT (Sandbox)
TWINT_SANDBOX_MODE=true

# PostFinance (Sandbox)
POSTFINANCE_SANDBOX_MODE=true

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## License

This project is a portfolio demonstration. Not affiliated with just-eat.ch.
