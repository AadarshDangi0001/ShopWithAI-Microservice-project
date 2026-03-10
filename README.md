# ShopWithAI E-commerce Microservices 

AI-enabled ecommerce backend built with Node.js, Express, MongoDB, and service-to-service communication. The project is split into independent backend services for authentication, product catalog, cart, order, payment, and an AI buddy (socket-based assistant).

## Project Structure

```text
Backend/
	AUTH/      -> user auth, profile, addresses, JWT cookie
	PRODUCT/   -> product CRUD, seller routes, image upload (ImageKit)
	CART/      -> cart management
	ORDER/     -> order creation from cart + product checks
	PAYMENT/   -> Razorpay order creation and verification
	AI-BUDDY/  -> socket.io + LangChain agent tools for shopping assistant
```

## Tech Stack

- Node.js + Express (ES modules)
- MongoDB + Mongoose
- JWT (cookie + bearer support in most services)
- Redis (token blacklist in AUTH)
- Razorpay (PAYMENT)
- ImageKit + Multer (PRODUCT image upload)
- Socket.IO + LangChain + Gemini (AI-BUDDY)
- Jest + Supertest (service-level tests)

## Service Ports

- `AUTH` -> `3000`
- `PRODUCT` -> `3001`
- `CART` -> `3002`
- `ORDER` -> `3003`
- `PAYMENT` -> `3004`
- `AI-BUDDY` -> `3005`

## Prerequisites

- Node.js 18+
- MongoDB running locally or cloud URI
- Redis running (needed for AUTH in non-test mode)
- Razorpay account keys (for PAYMENT)
- ImageKit credentials (for PRODUCT image uploads)
- Google GenAI API access (for AI-BUDDY)

## Environment Variables

Create a `.env` file in each service folder under `Backend/*`.

### Common (most services)

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/shopwithai
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

### AUTH (`Backend/AUTH/.env`)

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/shopwithai_auth
JWT_SECRET=your_jwt_secret
NODE_ENV=development

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

### PRODUCT (`Backend/PRODUCT/.env`)

```env
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/shopwithai_product
JWT_SECRET=your_jwt_secret
NODE_ENV=development

IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

### CART (`Backend/CART/.env`)

```env
PORT=3002
MONGO_URI=mongodb://127.0.0.1:27017/shopwithai_cart
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

### ORDER (`Backend/ORDER/.env`)

```env
PORT=3003
MONGO_URI=mongodb://127.0.0.1:27017/shopwithai_order
JWT_SECRET=your_jwt_secret
NODE_ENV=development

CART_SERVICE_URL=http://localhost:3002
PRODUCT_SERVICE_URL=http://localhost:3001
```

### PAYMENT (`Backend/PAYMENT/.env`)

```env
PORT=3004
MONGO_URI=mongodb://127.0.0.1:27017/shopwithai_payment
JWT_SECRET=your_jwt_secret
NODE_ENV=development

ORDER_SERVICE_URL=http://localhost:3003
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### AI-BUDDY (`Backend/AI-BUDDY/.env`)

```env
PORT=3005
JWT_SECRET=your_jwt_secret
GOOGLE_API_KEY=your_google_genai_api_key
```

## Installation

From repository root:

```bash
cd Backend/AUTH && npm install
cd ../PRODUCT && npm install
cd ../CART && npm install
cd ../ORDER && npm install
cd ../PAYMENT && npm install
cd ../AI-BUDDY && npm install
```

## Run Services

Start each service in a separate terminal:

```bash
cd Backend/AUTH && npm run dev
cd Backend/PRODUCT && npm run dev
cd Backend/CART && npm run dev
cd Backend/ORDER && npm run dev
cd Backend/PAYMENT && npm run dev
cd Backend/AI-BUDDY && npm run dev
```

## API Overview

Base URLs:

- AUTH: `http://localhost:3000`
- PRODUCT: `http://localhost:3001`
- CART: `http://localhost:3002`
- ORDER: `http://localhost:3003`
- PAYMENT: `http://localhost:3004`
- AI-BUDDY socket path: `http://localhost:3005/api/socket/socket.io/`

### AUTH

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/auth/users/me/addresses`
- `POST /api/auth/users/me/addresses`
- `DELETE /api/auth/users/me/addresses/:addressId`

### PRODUCT

- `POST /api/products` (seller/admin)
- `GET /api/products`
- `GET /api/products/seller` (seller)
- `GET /api/products/:id`
- `PATCH /api/products/:id` (seller owner)
- `DELETE /api/products/:id` (seller owner)

### CART

- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:productId`
- `DELETE /api/cart/items/:productId`
- `DELETE /api/cart`

### ORDER

- `POST /api/orders`
- `GET /api/orders/me`
- `GET /api/orders/:id`
- `POST /api/orders/:id/cancel`
- `PATCH /api/orders/:id/address`

### PAYMENT

- `POST /api/payments/create/:orderId`
- `POST /api/payments/verify`

## Testing

Run tests per service:

```bash
cd Backend/AUTH && npm test
cd Backend/PRODUCT && npm test
cd Backend/CART && npm test
cd Backend/ORDER && npm test
```

Note: PAYMENT and AI-BUDDY currently do not include test files in this repo structure.

## Auth Notes

- AUTH issues an HTTP-only `token` cookie.
- Most downstream services accept either:
	- Cookie token (`token`), or
	- `Authorization: Bearer <token>` header

## AI-BUDDY Notes

- Uses Socket.IO authentication via `token` cookie.
- Agent tools are intended to:
	- Search products
	- Add product to cart
- Designed for integration with your frontend chat assistant experience.

## Suggested Startup Order

1. `AUTH`
2. `PRODUCT`
3. `CART`
4. `ORDER`
5. `PAYMENT`
6. `AI-BUDDY`

This order helps ensure dependent services are available when upstream calls are made.
