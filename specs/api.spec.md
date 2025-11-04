# E-Commerce API Specification

RESTful API for e-commerce shopping cart and inventory management system. Exposes shopping cart operations, inventory search, and order tracking functionality via Express.js server running on port 3000.

## Architecture

The API is organized into modular route files following the standard Next.js directory structure:

```
src/
├── routes/
│   ├── inventory.ts      # Inventory search endpoints
│   ├── cart.ts          # Shopping cart endpoints
│   ├── orders.ts        # Order retrieval endpoints
│   └── index.ts         # Route aggregation
├── server.ts            # Express server setup
└── shopping-cart.ts     # Main export
```

## Base URL

```
http://localhost:3000/api
```

## Inventory Endpoints

### Search Inventory

Fuzzy search for inventory items by name.

**Endpoint:** `GET /inventory/search`

**Query Parameters:**
- `q` (string, required) - Search query for fuzzy name matching

**Response (200 OK):**
```json
{
  "success": true,
  "items": [
    {
      "id": "SHOE_001",
      "name": "Classic Running Shoes - Black",
      "price": 89.99,
      "availableQuantity": 150
    }
  ],
  "count": 1
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Search query is required"
}
```

---

## Shopping Cart Endpoints

### Create Cart

Initialize a new shopping cart session.

**Endpoint:** `POST /cart`

**Response (200 OK):**
```json
{
  "success": true,
  "cartId": "cart-uuid-1234",
  "message": "Cart created successfully"
}
```

---

### Get Cart Summary

Retrieve current cart contents and totals.

**Endpoint:** `GET /cart/:cartId`

**Response (200 OK):**
```json
{
  "success": true,
  "cart": {
    "items": [
      {
        "id": "SHOE_001",
        "name": "Classic Running Shoes - Black",
        "price": 89.99,
        "quantity": 1
      }
    ],
    "subtotal": 89.99,
    "tax": 7.20,
    "total": 97.19
  }
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "error": "Cart not found"
}
```

---

### Add Item to Cart

Add an item to the shopping cart.

**Endpoint:** `POST /cart/:cartId/items`

**Request Body:**
```json
{
  "itemId": "SHOE_001",
  "quantity": 2
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Item added to cart",
  "cart": {
    "items": [...],
    "subtotal": 179.98,
    "tax": 14.40,
    "total": 194.38
  }
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid item ID or quantity"
}
```

**Error (409 Conflict):**
```json
{
  "success": false,
  "error": "Insufficient inventory for item"
}
```

---

### Remove Item from Cart

Remove an item or reduce quantity in the shopping cart.

**Endpoint:** `DELETE /cart/:cartId/items/:itemId`

**Query Parameters:**
- `quantity` (number, optional) - Quantity to remove. If not provided, removes entire item.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Item removed from cart",
  "cart": {
    "items": [...],
    "subtotal": 89.99,
    "tax": 7.20,
    "total": 97.19
  }
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "error": "Item not found in cart"
}
```

---

### Checkout

Process payment and create order.

**Endpoint:** `POST /cart/:cartId/checkout`

**Request Body:**
```json
{
  "paymentMethod": "card",
  "amount": 97.19,
  "currency": "USD"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "orderId": "mock-uuid-1234",
  "message": "Checkout successful",
  "order": {
    "orderId": "mock-uuid-1234",
    "total": 97.19,
    "createdAt": "2025-11-04T17:30:00Z"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Cart is empty" or "Payment amount does not match cart total"
}
```

---

## Order Endpoints

### Get Order by ID

Retrieve a specific order.

**Endpoint:** `GET /orders/:orderId`

**Response (200 OK):**
```json
{
  "success": true,
  "order": {
    "orderId": "mock-uuid-1234",
    "userId": "default-user",
    "paymentId": "payment_1234567890",
    "items": [
      {
        "inventoryItemId": "SHOE_001",
        "name": "Classic Running Shoes - Black",
        "price": 89.99,
        "quantity": 1,
        "subtotal": 89.99
      }
    ],
    "subtotal": 89.99,
    "tax": 7.20,
    "total": 97.19,
    "createdAt": "2025-11-04T17:30:00Z"
  }
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "error": "Order not found"
}
```

---

### Get User Orders

Retrieve all orders for a user.

**Endpoint:** `GET /orders/user/:userId`

**Response (200 OK):**
```json
{
  "success": true,
  "orders": [
    {
      "orderId": "mock-uuid-1234",
      "total": 97.19,
      "createdAt": "2025-11-04T17:30:00Z"
    }
  ],
  "count": 1
}
```

---

## Error Responses

All endpoints return errors in this format:

**400 Bad Request** - Invalid input
**404 Not Found** - Resource not found
**409 Conflict** - Business logic violation (e.g., insufficient inventory)
**500 Internal Server Error** - Server error

```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Server Startup

Start the Express server and MongoDB connection:

```bash
npx tsx scripts/start-server.ts
```

Server will:
1. Load environment variables from `.env.local`
2. Connect to MongoDB using `MONGO_DB_URL`
3. Initialize Express app on port 3000
4. Mount all API routes
5. Log startup confirmation

---

## Demo API Flow

### 1. Create Cart
```bash
curl -X POST http://localhost:3000/api/cart
# Response: { "cartId": "cart-1234" }
```

### 2. Search Inventory
```bash
curl "http://localhost:3000/api/inventory/search?q=shoe"
# Returns matching shoe items
```

### 3. Add to Cart
```bash
curl -X POST http://localhost:3000/api/cart/cart-1234/items \
  -H "Content-Type: application/json" \
  -d '{"itemId":"SHOE_001","quantity":1}'
```

### 4. Get Cart
```bash
curl http://localhost:3000/api/cart/cart-1234
# Returns cart with subtotal, tax, total
```

### 5. Checkout
```bash
curl -X POST http://localhost:3000/api/cart/cart-1234/checkout \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"card","amount":97.19,"currency":"USD"}'
# Response: { "orderId": "mock-uuid-1234" }
```

### 6. Get Order
```bash
curl http://localhost:3000/api/orders/mock-uuid-1234
# Returns complete order details
```

---

## Dependencies

### Web Framework
Express.js for HTTP server and routing.
[@use](express)

### Database
MongoDB via Mongoose (already configured in shopping-cart and orders)
[@use](mongoose)

### Internal Services
- ShoppingCart service for cart operations
- InventoryManager service for inventory queries
- OrderService for order operations

---

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Optional message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description"
}
```

---

## Notes

- No authentication/authorization (demo only)
- Carts stored in-memory (cleared on server restart)
- Session-based cart management via cartId
- Inventory and orders persisted to MongoDB
- All monetary values in dollars (USD)
