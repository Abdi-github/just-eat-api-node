import config from './index.js';

const isProd = config.isProduction;

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Just Eat Clone API',
    version: '1.0.0',
    description: `
## Swiss Food Delivery Platform API

Production-grade REST API powering the just-eat.ch clone — a Swiss food delivery platform with multi-restaurant management, real-time order tracking, courier dispatch, and multilingual support.

### Demo Credentials

All demo accounts use password: **\`Password123!\`**

| Role | Email | Access |
|------|-------|--------|
| Super Admin | \`admin@justeat-clone.ch\` | Full platform access |
| Restaurant Owner | \`restaurant@justeat-clone.ch\` | Restaurant management |
| Courier | \`courier@justeat-clone.ch\` | Delivery management |
| Customer | \`customer@justeat-clone.ch\` | Ordering & reviews |

### User Types & Access Levels

| Type | Admin Panel | Restaurant Panel | Courier App | Customer Portal | Public |
|------|:-----------:|:----------------:|:-----------:|:---------------:|:------:|
| super_admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| restaurant_owner | ❌ | ✅ | ❌ | ✅ | ✅ |
| courier | ❌ | ❌ | ✅ | ❌ | ✅ |
| customer | ❌ | ❌ | ❌ | ✅ | ✅ |

### Multilingual Support

All endpoints accept the \`Accept-Language\` header with values: **de**, **fr**, **it**, **en**.
Translatable content (cuisine names, restaurant descriptions) is returned in the requested language.

### Authentication Flow

1. **Login** → \`POST /api/v1/public/auth/login\` → returns \`accessToken\` + \`refreshToken\`
2. **Use token** → \`Authorization: Bearer {accessToken}\` header
3. **Refresh** → \`POST /api/v1/public/auth/refresh\` with refresh token
4. **Logout** → \`POST /api/v1/public/auth/logout\`

### Payment Methods

Supported: **Stripe** (cards), **TWINT**, **PostFinance**, **Cash on delivery**
`,
  },
  servers: [
    ...(isProd
      ? [{ url: 'https://justeat-api.swiftapp.ch', description: 'Production' }]
      : []),
    { url: `http://localhost:${config.port}`, description: 'Development' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Login via `/api/v1/public/auth/login` to get a token',
      },
    },
    parameters: {
      AcceptLanguage: {
        name: 'Accept-Language',
        in: 'header',
        schema: { type: 'string', enum: ['de', 'fr', 'it', 'en'], default: 'de' },
        description: 'Response language',
      },
      IdParam: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'MongoDB ObjectId',
      },
      PageParam: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', default: 1, minimum: 1 },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'integer' },
              message: { type: 'string' },
            },
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'array', items: { type: 'object' } },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
              hasNextPage: { type: 'boolean' },
              hasPrevPage: { type: 'boolean' },
            },
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@justeat-clone.ch' },
          password: { type: 'string', example: 'Password123!' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  user_type: { type: 'string' },
                },
              },
              tokens: {
                type: 'object',
                properties: {
                  access_token: { type: 'string' },
                  refresh_token: { type: 'string' },
                },
              },
            },
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'first_name', 'last_name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, description: 'Must have uppercase, lowercase, digit, and special character' },
          first_name: { type: 'string', maxLength: 100 },
          last_name: { type: 'string', maxLength: 100 },
          phone: { type: 'string' },
          preferred_language: { type: 'string', enum: ['de', 'fr', 'it', 'en'] },
        },
      },
      Canton: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          code: { type: 'string', example: 'ZH' },
          name: { type: 'object', properties: { de: { type: 'string' }, fr: { type: 'string' }, it: { type: 'string' }, en: { type: 'string' } } },
          capital: { type: 'string' },
          population: { type: 'integer' },
          area_km2: { type: 'number' },
        },
      },
      City: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          postal_code: { type: 'string' },
          canton_id: { type: 'string' },
          population: { type: 'integer' },
        },
      },
      Restaurant: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'object', properties: { de: { type: 'string' }, fr: { type: 'string' }, it: { type: 'string' }, en: { type: 'string' } } },
          cuisine_ids: { type: 'array', items: { type: 'string' } },
          brand_id: { type: 'string' },
          address: { type: 'object' },
          phone: { type: 'string' },
          email: { type: 'string' },
          opening_hours: { type: 'object' },
          delivery_radius_km: { type: 'number' },
          minimum_order: { type: 'number' },
          delivery_fee: { type: 'number' },
          estimated_delivery_time: { type: 'integer', description: 'Minutes' },
          rating_average: { type: 'number' },
          rating_count: { type: 'integer' },
          is_active: { type: 'boolean' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'suspended'] },
        },
      },
      Cuisine: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'object', properties: { de: { type: 'string' }, fr: { type: 'string' }, it: { type: 'string' }, en: { type: 'string' } } },
          slug: { type: 'string' },
          icon: { type: 'string' },
          is_active: { type: 'boolean' },
        },
      },
      Brand: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          logo_url: { type: 'string' },
          is_active: { type: 'boolean' },
        },
      },
      MenuItem: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'object', properties: { de: { type: 'string' }, fr: { type: 'string' }, it: { type: 'string' }, en: { type: 'string' } } },
          description: { type: 'object', properties: { de: { type: 'string' }, fr: { type: 'string' }, it: { type: 'string' }, en: { type: 'string' } } },
          price: { type: 'number' },
          category: { type: 'string' },
          image_url: { type: 'string' },
          is_available: { type: 'boolean' },
          allergens: { type: 'array', items: { type: 'string' } },
          options: { type: 'array', items: { type: 'object' } },
        },
      },
      Order: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          order_number: { type: 'string' },
          user_id: { type: 'string' },
          restaurant_id: { type: 'string' },
          items: { type: 'array', items: { type: 'object' } },
          subtotal: { type: 'number' },
          delivery_fee: { type: 'number' },
          total: { type: 'number' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivering', 'delivered', 'cancelled', 'refunded'] },
          delivery_address: { type: 'object' },
          payment_method: { type: 'string', enum: ['stripe', 'twint', 'postfinance', 'cash'] },
          payment_status: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'] },
          estimated_delivery_time: { type: 'string', format: 'date-time' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          email: { type: 'string' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          phone: { type: 'string' },
          user_type: { type: 'string', enum: ['customer', 'restaurant_owner', 'courier', 'admin', 'super_admin'] },
          status: { type: 'string', enum: ['active', 'pending', 'suspended', 'inactive'] },
          preferred_language: { type: 'string', enum: ['de', 'fr', 'it', 'en'] },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid JWT token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      ValidationError: {
        description: 'Validation failed',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Auth', description: 'Authentication & registration' },
    { name: 'Users', description: 'User profile management (auth)' },
    { name: 'Cantons', description: 'Swiss cantons (public)' },
    { name: 'Cities', description: 'Swiss cities (public)' },
    { name: 'Cuisines', description: 'Cuisine types (public)' },
    { name: 'Brands', description: 'Restaurant brands (public)' },
    { name: 'Restaurants', description: 'Restaurant listings (public)' },
    { name: 'Menu', description: 'Restaurant menus (public)' },
    { name: 'Search', description: 'Search & autocomplete (public)' },
    { name: 'Addresses', description: 'Delivery address management (auth)' },
    { name: 'Orders', description: 'Order management (auth)' },
    { name: 'Payments', description: 'Payment processing (auth)' },
    { name: 'Deliveries', description: 'Delivery tracking (auth)' },
    { name: 'Reviews', description: 'Restaurant reviews (auth)' },
    { name: 'Favorites', description: 'Favorite restaurants (auth)' },
    { name: 'Promotions', description: 'Coupons & stamp cards (auth)' },
    { name: 'Notifications', description: 'User notifications (auth)' },
    { name: 'Restaurant Management', description: 'Restaurant owner panel (restaurant role)' },
    { name: 'Courier Management', description: 'Courier operations (courier role)' },
    { name: 'Admin Users', description: 'User management (admin)' },
    { name: 'Admin Locations', description: 'Canton & city management (admin)' },
    { name: 'Admin Cuisines', description: 'Cuisine management (admin)' },
    { name: 'Admin Brands', description: 'Brand management (admin)' },
    { name: 'Admin Restaurants', description: 'Restaurant management (admin)' },
    { name: 'Admin Orders', description: 'Order management (admin)' },
    { name: 'Admin Payments', description: 'Payment management (admin)' },
    { name: 'Admin Deliveries', description: 'Delivery management (admin)' },
    { name: 'Admin Reviews', description: 'Review moderation (admin)' },
    { name: 'Admin Promotions', description: 'Promotion management (admin)' },
    { name: 'Admin Analytics', description: 'Platform analytics (admin)' },
    { name: 'Admin Applications', description: 'Restaurant/courier applications (admin)' },
  ],
  paths: {
    // ═══════════════════════════════════════════════════════════════
    // HEALTH
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: { 200: { description: 'API is healthy', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/api/v1/health/queues': {
      get: {
        tags: ['Health'],
        summary: 'Queue health check',
        description: 'Check BullMQ queue health status',
        responses: { 200: { description: 'Queue health status' }, 503: { description: 'Queue health check failed' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/public/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new customer',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: {
          201: { description: 'Registration successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/v1/public/auth/register-restaurant': {
      post: {
        tags: ['Auth'],
        summary: 'Register as restaurant owner',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: { 201: { description: 'Restaurant registration submitted' }, 422: { $ref: '#/components/responses/ValidationError' } },
      },
    },
    '/api/v1/public/auth/register-courier': {
      post: {
        tags: ['Auth'],
        summary: 'Register as courier',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: { 201: { description: 'Courier registration submitted' }, 422: { $ref: '#/components/responses/ValidationError' } },
      },
    },
    '/api/v1/public/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refresh_token'], properties: { refresh_token: { type: 'string' } } } } } },
        responses: { 200: { description: 'New tokens issued' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/api/v1/public/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Logged out successfully' } },
      },
    },
    '/api/v1/public/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Current user details' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/api/v1/public/auth/me/update': {
      patch: {
        tags: ['Auth'],
        summary: 'Update current user profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Profile updated' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/api/v1/public/auth/application-status': {
      get: {
        tags: ['Auth'],
        summary: 'Get application status',
        description: 'Check restaurant/courier application approval status',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Application status' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // USER PROFILE
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Get own profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User profile' } },
      },
      put: {
        tags: ['Users'],
        summary: 'Update own profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Profile updated' } },
      },
    },
    '/api/v1/public/users/password': {
      put: {
        tags: ['Users'],
        summary: 'Change password',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['current_password', 'new_password'], properties: { current_password: { type: 'string' }, new_password: { type: 'string', minLength: 8 } } } } } },
        responses: { 200: { description: 'Password changed' } },
      },
    },
    '/api/v1/public/users/deactivate': {
      post: {
        tags: ['Users'],
        summary: 'Deactivate own account',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Account deactivated' } },
      },
    },
    '/api/v1/public/users/settings': {
      get: {
        tags: ['Users'],
        summary: 'Get notification preferences',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Notification settings' } },
      },
      put: {
        tags: ['Users'],
        summary: 'Update notification preferences',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Settings updated' } },
      },
    },
    '/api/v1/public/users/avatar': {
      post: {
        tags: ['Users'],
        summary: 'Upload avatar',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } } } },
        responses: { 200: { description: 'Avatar uploaded' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'Remove avatar',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Avatar removed' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // LOCATIONS — CANTONS (PUBLIC)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/locations/cantons': {
      get: {
        tags: ['Cantons'],
        summary: 'List all cantons',
        parameters: [{ $ref: '#/components/parameters/AcceptLanguage' }],
        responses: { 200: { description: 'List of Swiss cantons' } },
      },
    },
    '/api/v1/public/locations/cantons/code/{code}': {
      get: {
        tags: ['Cantons'],
        summary: 'Get canton by code',
        parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string', example: 'ZH' } }],
        responses: { 200: { description: 'Canton details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/v1/public/locations/cantons/slug/{slug}': {
      get: {
        tags: ['Cantons'],
        summary: 'Get canton by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Canton details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/v1/public/locations/cantons/{id}': {
      get: {
        tags: ['Cantons'],
        summary: 'Get canton by ID',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Canton details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/v1/public/locations/cantons/{id}/cities': {
      get: {
        tags: ['Cantons'],
        summary: 'Get cities in canton',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'List of cities in canton' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // LOCATIONS — CITIES (PUBLIC)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/locations/cities': {
      get: {
        tags: ['Cities'],
        summary: 'List all cities',
        parameters: [{ $ref: '#/components/parameters/AcceptLanguage' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
        responses: { 200: { description: 'List of cities' } },
      },
    },
    '/api/v1/public/locations/cities/search': {
      get: {
        tags: ['Cities'],
        summary: 'Search locations',
        parameters: [{ name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search query' }],
        responses: { 200: { description: 'Search results (cantons + cities)' } },
      },
    },
    '/api/v1/public/locations/cities/postal/{postalCode}': {
      get: {
        tags: ['Cities'],
        summary: 'Get cities by postal code',
        parameters: [{ name: 'postalCode', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Cities matching postal code' } },
      },
    },
    '/api/v1/public/locations/cities/slug/{slug}': {
      get: {
        tags: ['Cities'],
        summary: 'Get city by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'City details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/v1/public/locations/cities/{id}': {
      get: {
        tags: ['Cities'],
        summary: 'Get city by ID',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'City details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // CUISINES (PUBLIC)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/cuisines': {
      get: {
        tags: ['Cuisines'],
        summary: 'List all cuisines',
        parameters: [{ $ref: '#/components/parameters/AcceptLanguage' }],
        responses: { 200: { description: 'List of cuisines' } },
      },
    },
    '/api/v1/public/cuisines/slug/{slug}': {
      get: {
        tags: ['Cuisines'],
        summary: 'Get cuisine by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Cuisine details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/v1/public/cuisines/{id}': {
      get: {
        tags: ['Cuisines'],
        summary: 'Get cuisine by ID',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Cuisine details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // BRANDS (PUBLIC)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/brands': {
      get: {
        tags: ['Brands'],
        summary: 'List all brands',
        responses: { 200: { description: 'List of brands' } },
      },
    },
    '/api/v1/public/brands/slug/{slug}': {
      get: {
        tags: ['Brands'],
        summary: 'Get brand by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Brand details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/v1/public/brands/{id}': {
      get: {
        tags: ['Brands'],
        summary: 'Get brand by ID',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Brand details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // RESTAURANTS (PUBLIC)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/restaurants': {
      get: {
        tags: ['Restaurants'],
        summary: 'List restaurants',
        parameters: [{ $ref: '#/components/parameters/AcceptLanguage' }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'cuisine', in: 'query', schema: { type: 'string' } }, { name: 'city', in: 'query', schema: { type: 'string' } }, { name: 'sort', in: 'query', schema: { type: 'string', enum: ['rating', 'delivery_time', 'delivery_fee', 'minimum_order'] } }],
        responses: { 200: { description: 'Paginated restaurant list', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } },
      },
    },
    '/api/v1/public/restaurants/cursor': {
      get: {
        tags: ['Restaurants'],
        summary: 'List restaurants (cursor pagination)',
        parameters: [{ name: 'cursor', in: 'query', schema: { type: 'string' } }, { $ref: '#/components/parameters/LimitParam' }],
        responses: { 200: { description: 'Cursor-paginated restaurants' } },
      },
    },
    '/api/v1/public/restaurants/slug/{slug}': {
      get: {
        tags: ['Restaurants'],
        summary: 'Get restaurant by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Restaurant details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Restaurant' } } } }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/v1/public/restaurants/{id}': {
      get: {
        tags: ['Restaurants'],
        summary: 'Get restaurant by ID',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Restaurant details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // MENU (PUBLIC)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/restaurants/{restaurantId}/menu': {
      get: {
        tags: ['Menu'],
        summary: 'Get restaurant menu',
        parameters: [{ name: 'restaurantId', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/AcceptLanguage' }],
        responses: { 200: { description: 'Full restaurant menu with categories' } },
      },
    },
    '/api/v1/public/restaurants/{restaurantId}/menu/items': {
      get: {
        tags: ['Menu'],
        summary: 'Get menu items (flat list)',
        parameters: [{ name: 'restaurantId', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
        responses: { 200: { description: 'Paginated menu items' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // SEARCH (PUBLIC)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/search/restaurants': {
      get: {
        tags: ['Search'],
        summary: 'Search restaurants',
        parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'cuisine', in: 'query', schema: { type: 'string' } }, { name: 'city', in: 'query', schema: { type: 'string' } }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
        responses: { 200: { description: 'Search results' } },
      },
    },
    '/api/v1/public/search/restaurants/{restaurantId}/menu': {
      get: {
        tags: ['Search'],
        summary: 'Search menu items',
        parameters: [{ name: 'restaurantId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'q', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Menu search results' } },
      },
    },
    '/api/v1/public/search/suggestions': {
      get: {
        tags: ['Search'],
        summary: 'Autocomplete suggestions',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Suggestion list' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADDRESSES (AUTH)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/addresses': {
      get: {
        tags: ['Addresses'],
        summary: 'List delivery addresses',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User addresses' } },
      },
      post: {
        tags: ['Addresses'],
        summary: 'Create delivery address',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['street', 'city', 'postal_code'], properties: { street: { type: 'string' }, city: { type: 'string' }, postal_code: { type: 'string' }, canton: { type: 'string' }, label: { type: 'string', example: 'Home' }, is_default: { type: 'boolean' } } } } } },
        responses: { 201: { description: 'Address created' } },
      },
    },
    '/api/v1/public/addresses/{id}': {
      get: {
        tags: ['Addresses'],
        summary: 'Get address by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Address details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      put: {
        tags: ['Addresses'],
        summary: 'Update address',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Address updated' } },
      },
      delete: {
        tags: ['Addresses'],
        summary: 'Delete address',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Address deleted' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ORDERS (AUTH)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Place a new order',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['restaurant_id', 'items', 'delivery_address_id', 'payment_method'], properties: { restaurant_id: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { menu_item_id: { type: 'string' }, quantity: { type: 'integer' } } } }, delivery_address_id: { type: 'string' }, payment_method: { type: 'string', enum: ['stripe', 'twint', 'postfinance', 'cash'] }, coupon_code: { type: 'string' }, notes: { type: 'string' } } } } } },
        responses: { 201: { description: 'Order placed' }, 422: { $ref: '#/components/responses/ValidationError' } },
      },
    },
    '/api/v1/public/orders/my': {
      get: {
        tags: ['Orders'],
        summary: 'Get my orders',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'status', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Customer orders' } },
      },
    },
    '/api/v1/public/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order details',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Order details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/v1/public/orders/{id}/cancel': {
      patch: {
        tags: ['Orders'],
        summary: 'Cancel an order',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Order cancelled' }, 400: { description: 'Cannot cancel (already in progress)' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENTS (AUTH)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/payments/initiate': {
      post: {
        tags: ['Payments'],
        summary: 'Initiate payment',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['order_id'], properties: { order_id: { type: 'string' } } } } } },
        responses: { 200: { description: 'Payment session created (Stripe client_secret or redirect URL)' } },
      },
    },
    '/api/v1/public/payments/{orderId}/status': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Payment status' } },
      },
    },
    '/api/v1/public/payments/{orderId}/cash/confirm': {
      post: {
        tags: ['Payments'],
        summary: 'Confirm cash payment',
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Cash payment confirmed' } },
      },
    },
    '/api/v1/public/payments/twint/simulate-confirm/{transactionId}': {
      post: {
        tags: ['Payments'],
        summary: 'Simulate TWINT confirmation (sandbox)',
        parameters: [{ name: 'transactionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'TWINT payment simulated' } },
      },
    },
    '/api/v1/public/payments/postfinance/simulate-confirm/{transactionId}': {
      post: {
        tags: ['Payments'],
        summary: 'Simulate PostFinance confirmation (sandbox)',
        parameters: [{ name: 'transactionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'PostFinance payment simulated' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // DELIVERIES (AUTH)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/deliveries/{orderId}/track': {
      get: {
        tags: ['Deliveries'],
        summary: 'Track delivery',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Delivery tracking info' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // REVIEWS (PUBLIC + AUTH)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/reviews/restaurant/{restaurantId}': {
      get: {
        tags: ['Reviews'],
        summary: 'Get restaurant reviews',
        parameters: [{ name: 'restaurantId', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
        responses: { 200: { description: 'Approved reviews for restaurant' } },
      },
    },
    '/api/v1/public/reviews/restaurant/{restaurantId}/summary': {
      get: {
        tags: ['Reviews'],
        summary: 'Get rating summary',
        parameters: [{ name: 'restaurantId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Rating summary (average, distribution)' } },
      },
    },
    '/api/v1/public/reviews': {
      post: {
        tags: ['Reviews'],
        summary: 'Create a review',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['restaurant_id', 'order_id', 'rating'], properties: { restaurant_id: { type: 'string' }, order_id: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string' } } } } } },
        responses: { 201: { description: 'Review created' } },
      },
    },
    '/api/v1/public/reviews/my': {
      get: {
        tags: ['Reviews'],
        summary: 'Get my reviews',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User\'s reviews' } },
      },
    },
    '/api/v1/public/reviews/{id}': {
      patch: {
        tags: ['Reviews'],
        summary: 'Update own review',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Review updated' } },
      },
      delete: {
        tags: ['Reviews'],
        summary: 'Delete own review',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Review deleted' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // FAVORITES (AUTH)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/favorites': {
      get: {
        tags: ['Favorites'],
        summary: 'Get favorite restaurants',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Favorite restaurants list' } },
      },
    },
    '/api/v1/public/favorites/toggle': {
      post: {
        tags: ['Favorites'],
        summary: 'Toggle favorite',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['restaurant_id'], properties: { restaurant_id: { type: 'string' } } } } } },
        responses: { 200: { description: 'Favorite toggled' } },
      },
    },
    '/api/v1/public/favorites/check/{restaurantId}': {
      get: {
        tags: ['Favorites'],
        summary: 'Check if favorited',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'restaurantId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Favorite status' } },
      },
    },
    '/api/v1/public/favorites/{restaurantId}': {
      delete: {
        tags: ['Favorites'],
        summary: 'Remove from favorites',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'restaurantId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Removed from favorites' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // PROMOTIONS (AUTH)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/promotions/coupons/validate': {
      post: {
        tags: ['Promotions'],
        summary: 'Validate coupon code',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['code'], properties: { code: { type: 'string' }, order_total: { type: 'number' } } } } } },
        responses: { 200: { description: 'Coupon validation result' } },
      },
    },
    '/api/v1/public/promotions/stamps/my-progress': {
      get: {
        tags: ['Promotions'],
        summary: 'Get stamp progress',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Stamp card progress' } },
      },
    },
    '/api/v1/public/promotions/stamps/{id}/redeem': {
      post: {
        tags: ['Promotions'],
        summary: 'Redeem stamp card',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Stamp card redeemed' } },
      },
    },
    '/api/v1/public/promotions/stamps/restaurant/{restaurantId}': {
      get: {
        tags: ['Promotions'],
        summary: 'Get stamp cards for restaurant',
        parameters: [{ name: 'restaurantId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Restaurant stamp cards' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS (AUTH)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/public/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notifications',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
        responses: { 200: { description: 'User notifications' } },
      },
      delete: {
        tags: ['Notifications'],
        summary: 'Delete all notifications',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'All notifications deleted' } },
      },
    },
    '/api/v1/public/notifications/count': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notification count',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Total and unread count' } },
      },
    },
    '/api/v1/public/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all as read',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'All notifications marked as read' } },
      },
    },
    '/api/v1/public/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark notification as read',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Notification marked as read' } },
      },
    },
    '/api/v1/public/notifications/{id}': {
      delete: {
        tags: ['Notifications'],
        summary: 'Delete notification',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Notification deleted' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — USER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/admin/users': {
      get: {
        tags: ['Admin Users'],
        summary: 'List all users',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'user_type', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Paginated user list' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
      post: {
        tags: ['Admin Users'],
        summary: 'Create user',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: { 201: { description: 'User created' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    '/api/v1/admin/users/statistics': {
      get: {
        tags: ['Admin Users'],
        summary: 'Get user statistics',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User statistics by type and status' } },
      },
    },
    '/api/v1/admin/users/{id}': {
      get: {
        tags: ['Admin Users'],
        summary: 'Get user by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'User details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      put: {
        tags: ['Admin Users'],
        summary: 'Update user',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'User updated' } },
      },
      delete: {
        tags: ['Admin Users'],
        summary: 'Delete user',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'User deleted' } },
      },
    },
    '/api/v1/admin/users/{id}/activate': {
      patch: {
        tags: ['Admin Users'],
        summary: 'Activate user',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'User activated' } },
      },
    },
    '/api/v1/admin/users/{id}/suspend': {
      patch: {
        tags: ['Admin Users'],
        summary: 'Suspend user',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'User suspended' } },
      },
    },
    '/api/v1/admin/users/{id}/roles': {
      post: {
        tags: ['Admin Users'],
        summary: 'Assign role',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['role'], properties: { role: { type: 'string' } } } } } },
        responses: { 200: { description: 'Role assigned' } },
      },
    },
    '/api/v1/admin/users/{id}/roles/{role}': {
      delete: {
        tags: ['Admin Users'],
        summary: 'Remove role',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }, { name: 'role', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Role removed' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — LOCATIONS
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/admin/locations/cantons': {
      post: {
        tags: ['Admin Locations'],
        summary: 'Create canton',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Canton created' } },
      },
    },
    '/api/v1/admin/locations/cantons/{id}': {
      put: {
        tags: ['Admin Locations'],
        summary: 'Update canton',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Canton updated' } },
      },
      delete: {
        tags: ['Admin Locations'],
        summary: 'Delete canton',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Canton deleted' } },
      },
    },
    '/api/v1/admin/locations/cities': {
      post: {
        tags: ['Admin Locations'],
        summary: 'Create city',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'City created' } },
      },
    },
    '/api/v1/admin/locations/cities/{id}': {
      put: {
        tags: ['Admin Locations'],
        summary: 'Update city',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'City updated' } },
      },
      delete: {
        tags: ['Admin Locations'],
        summary: 'Delete city',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'City deleted' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — CUISINES
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/admin/cuisines': {
      post: {
        tags: ['Admin Cuisines'],
        summary: 'Create cuisine',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Cuisine created' } },
      },
    },
    '/api/v1/admin/cuisines/{id}': {
      put: {
        tags: ['Admin Cuisines'],
        summary: 'Update cuisine',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Cuisine updated' } },
      },
      delete: {
        tags: ['Admin Cuisines'],
        summary: 'Delete cuisine',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Cuisine deleted' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — BRANDS
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/admin/brands': {
      post: {
        tags: ['Admin Brands'],
        summary: 'Create brand',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Brand created' } },
      },
    },
    '/api/v1/admin/brands/{id}': {
      put: {
        tags: ['Admin Brands'],
        summary: 'Update brand',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Brand updated' } },
      },
      delete: {
        tags: ['Admin Brands'],
        summary: 'Delete brand',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Brand deleted' } },
      },
    },
    '/api/v1/admin/brands/{id}/logo': {
      post: {
        tags: ['Admin Brands'],
        summary: 'Upload brand logo',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { logo: { type: 'string', format: 'binary' } } } } } },
        responses: { 200: { description: 'Logo uploaded' } },
      },
      delete: {
        tags: ['Admin Brands'],
        summary: 'Remove brand logo',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Logo removed' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — RESTAURANTS
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/admin/restaurants': {
      get: {
        tags: ['Admin Restaurants'],
        summary: 'List all restaurants',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'status', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'All restaurants (including inactive)' } },
      },
    },
    '/api/v1/admin/restaurants/pending': {
      get: {
        tags: ['Admin Restaurants'],
        summary: 'Get pending restaurants',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Restaurants awaiting approval' } },
      },
    },
    '/api/v1/admin/restaurants/{id}': {
      get: {
        tags: ['Admin Restaurants'],
        summary: 'Get restaurant details',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Restaurant details' } },
      },
      put: {
        tags: ['Admin Restaurants'],
        summary: 'Update restaurant',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Restaurant updated' } },
      },
      delete: {
        tags: ['Admin Restaurants'],
        summary: 'Delete restaurant',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Restaurant deleted' } },
      },
    },
    '/api/v1/admin/restaurants/{id}/status': {
      patch: {
        tags: ['Admin Restaurants'],
        summary: 'Change restaurant status',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['approved', 'rejected', 'suspended'] } } } } } },
        responses: { 200: { description: 'Status updated' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — ORDERS
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/admin/orders': {
      get: {
        tags: ['Admin Orders'],
        summary: 'List all orders',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'status', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'All orders' } },
      },
    },
    '/api/v1/admin/orders/{id}': {
      get: {
        tags: ['Admin Orders'],
        summary: 'Get order details',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Order details' } },
      },
    },
    '/api/v1/admin/orders/{id}/status': {
      patch: {
        tags: ['Admin Orders'],
        summary: 'Update order status',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Order status updated' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — PAYMENTS
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/admin/payments': {
      get: {
        tags: ['Admin Payments'],
        summary: 'List all payments',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
        responses: { 200: { description: 'All payment transactions' } },
      },
    },
    '/api/v1/admin/payments/{id}': {
      get: {
        tags: ['Admin Payments'],
        summary: 'Get payment details',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Payment transaction details' } },
      },
    },
    '/api/v1/admin/payments/{orderId}/refund': {
      post: {
        tags: ['Admin Payments'],
        summary: 'Process refund',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Refund processed' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — DELIVERIES
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/admin/deliveries': {
      get: {
        tags: ['Admin Deliveries'],
        summary: 'List all deliveries',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
        responses: { 200: { description: 'All deliveries' } },
      },
    },
    '/api/v1/admin/deliveries/{id}': {
      get: {
        tags: ['Admin Deliveries'],
        summary: 'Get delivery details',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Delivery details' } },
      },
    },
    '/api/v1/admin/deliveries/create': {
      post: {
        tags: ['Admin Deliveries'],
        summary: 'Create delivery assignment',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Delivery created' } },
      },
    },
    '/api/v1/admin/deliveries/{id}/assign': {
      post: {
        tags: ['Admin Deliveries'],
        summary: 'Assign courier to delivery',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Courier assigned' } },
      },
    },
    '/api/v1/admin/deliveries/{id}/cancel': {
      post: {
        tags: ['Admin Deliveries'],
        summary: 'Cancel delivery',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Delivery cancelled' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — REVIEWS
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/admin/reviews': {
      get: {
        tags: ['Admin Reviews'],
        summary: 'List all reviews',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'flagged'] } }],
        responses: { 200: { description: 'All reviews' } },
      },
    },
    '/api/v1/admin/reviews/{id}': {
      get: {
        tags: ['Admin Reviews'],
        summary: 'Get review details',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Review details' } },
      },
      delete: {
        tags: ['Admin Reviews'],
        summary: 'Delete review',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Review deleted' } },
      },
    },
    '/api/v1/admin/reviews/{id}/moderate': {
      patch: {
        tags: ['Admin Reviews'],
        summary: 'Moderate review',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['action'], properties: { action: { type: 'string', enum: ['approve', 'reject', 'flag'] }, reason: { type: 'string' } } } } } },
        responses: { 200: { description: 'Review moderated' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — PROMOTIONS
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/admin/promotions/coupons': {
      get: {
        tags: ['Admin Promotions'],
        summary: 'List all coupons',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'All coupons' } },
      },
      post: {
        tags: ['Admin Promotions'],
        summary: 'Create coupon',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Coupon created' } },
      },
    },
    '/api/v1/admin/promotions/coupons/{id}': {
      get: {
        tags: ['Admin Promotions'],
        summary: 'Get coupon details',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Coupon details' } },
      },
      put: {
        tags: ['Admin Promotions'],
        summary: 'Update coupon',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Coupon updated' } },
      },
      delete: {
        tags: ['Admin Promotions'],
        summary: 'Delete coupon',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Coupon deleted' } },
      },
    },
    '/api/v1/admin/promotions/stamp-cards': {
      get: {
        tags: ['Admin Promotions'],
        summary: 'List all stamp cards',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'All stamp cards' } },
      },
      post: {
        tags: ['Admin Promotions'],
        summary: 'Create stamp card',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Stamp card created' } },
      },
    },
    '/api/v1/admin/promotions/stamp-cards/{id}': {
      get: {
        tags: ['Admin Promotions'],
        summary: 'Get stamp card details',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Stamp card details' } },
      },
      put: {
        tags: ['Admin Promotions'],
        summary: 'Update stamp card',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Stamp card updated' } },
      },
      delete: {
        tags: ['Admin Promotions'],
        summary: 'Delete stamp card',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Stamp card deleted' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/admin/analytics': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get platform analytics',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'period', in: 'query', schema: { type: 'string', enum: ['day', 'week', 'month', 'year'] } }],
        responses: { 200: { description: 'Platform-wide analytics' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — APPLICATIONS
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/admin/applications': {
      get: {
        tags: ['Admin Applications'],
        summary: 'List applications',
        description: 'List restaurant/courier registration applications',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'type', in: 'query', schema: { type: 'string', enum: ['restaurant', 'courier'] } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] } }],
        responses: { 200: { description: 'Application list' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // RESTAURANT MANAGEMENT (RESTAURANT OWNER ROLE)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/restaurant/profile': {
      get: {
        tags: ['Restaurant Management'],
        summary: 'Get own restaurant profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Restaurant profile' } },
      },
      put: {
        tags: ['Restaurant Management'],
        summary: 'Update restaurant profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Restaurant updated' } },
      },
    },
    '/api/v1/restaurant/menu': {
      get: {
        tags: ['Restaurant Management'],
        summary: 'Get own restaurant menu',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Restaurant menu' } },
      },
    },
    '/api/v1/restaurant/menu/items': {
      get: {
        tags: ['Restaurant Management'],
        summary: 'List menu items',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
        responses: { 200: { description: 'Menu items' } },
      },
      post: {
        tags: ['Restaurant Management'],
        summary: 'Add menu item',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Menu item created' } },
      },
    },
    '/api/v1/restaurant/menu/items/{id}': {
      put: {
        tags: ['Restaurant Management'],
        summary: 'Update menu item',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Menu item updated' } },
      },
      delete: {
        tags: ['Restaurant Management'],
        summary: 'Delete menu item',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Menu item deleted' } },
      },
    },
    '/api/v1/restaurant/menu/categories': {
      get: {
        tags: ['Restaurant Management'],
        summary: 'List menu categories',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Menu categories' } },
      },
      post: {
        tags: ['Restaurant Management'],
        summary: 'Create menu category',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Category created' } },
      },
    },
    '/api/v1/restaurant/menu/categories/{id}': {
      put: {
        tags: ['Restaurant Management'],
        summary: 'Update menu category',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Category updated' } },
      },
      delete: {
        tags: ['Restaurant Management'],
        summary: 'Delete menu category',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Category deleted' } },
      },
    },
    '/api/v1/restaurant/orders': {
      get: {
        tags: ['Restaurant Management'],
        summary: 'Get restaurant orders',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'status', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Restaurant orders' } },
      },
    },
    '/api/v1/restaurant/orders/{id}/status': {
      patch: {
        tags: ['Restaurant Management'],
        summary: 'Update order status',
        description: 'Restaurant owner can update order through preparation stages',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['confirmed', 'preparing', 'ready'] } } } } } },
        responses: { 200: { description: 'Order status updated' } },
      },
    },
    '/api/v1/restaurant/analytics': {
      get: {
        tags: ['Restaurant Management'],
        summary: 'Get restaurant analytics',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'period', in: 'query', schema: { type: 'string', enum: ['day', 'week', 'month'] } }],
        responses: { 200: { description: 'Restaurant analytics (orders, revenue, ratings)' } },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // COURIER MANAGEMENT (COURIER ROLE)
    // ═══════════════════════════════════════════════════════════════
    '/api/v1/courier/profile': {
      get: {
        tags: ['Courier Management'],
        summary: 'Get courier profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Courier profile and stats' } },
      },
      put: {
        tags: ['Courier Management'],
        summary: 'Update courier profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Profile updated' } },
      },
    },
    '/api/v1/courier/status': {
      patch: {
        tags: ['Courier Management'],
        summary: 'Update availability status',
        description: 'Toggle online/offline status',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['online', 'offline', 'busy'] } } } } } },
        responses: { 200: { description: 'Status updated' } },
      },
    },
    '/api/v1/courier/location': {
      put: {
        tags: ['Courier Management'],
        summary: 'Update current location',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['lat', 'lng'], properties: { lat: { type: 'number' }, lng: { type: 'number' } } } } } },
        responses: { 200: { description: 'Location updated' } },
      },
    },
    '/api/v1/courier/deliveries': {
      get: {
        tags: ['Courier Management'],
        summary: 'Get assigned deliveries',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['assigned', 'picked_up', 'delivering', 'completed'] } }],
        responses: { 200: { description: 'Courier deliveries' } },
      },
    },
    '/api/v1/courier/deliveries/available': {
      get: {
        tags: ['Courier Management'],
        summary: 'Get available deliveries',
        description: 'Deliveries in courier\'s area that can be accepted',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Available deliveries nearby' } },
      },
    },
    '/api/v1/courier/deliveries/{id}/accept': {
      post: {
        tags: ['Courier Management'],
        summary: 'Accept delivery',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Delivery accepted' } },
      },
    },
    '/api/v1/courier/deliveries/{id}/reject': {
      post: {
        tags: ['Courier Management'],
        summary: 'Reject delivery',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Delivery rejected' } },
      },
    },
    '/api/v1/courier/deliveries/{id}/pickup': {
      post: {
        tags: ['Courier Management'],
        summary: 'Confirm pickup',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Pickup confirmed' } },
      },
    },
    '/api/v1/courier/deliveries/{id}/complete': {
      post: {
        tags: ['Courier Management'],
        summary: 'Complete delivery',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Delivery completed' } },
      },
    },
    '/api/v1/courier/earnings': {
      get: {
        tags: ['Courier Management'],
        summary: 'Get earnings summary',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'period', in: 'query', schema: { type: 'string', enum: ['day', 'week', 'month'] } }],
        responses: { 200: { description: 'Earnings breakdown' } },
      },
    },
  },
};
