# E-Commerce API Usage Guide

This guide demonstrates how to use the E-Commerce API for shopping cart and inventory management.

## Starting the Server

```bash
npx tsx scripts/start-server.ts
```

The server will start on `http://localhost:3000` and you should see:
```
🚀 E-Commerce API Server running on http://localhost:3000
```

## API Examples

### 1. Health Check

Verify the server is running:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-04T17:45:00.000Z"
}
```

---

### 2. Search Inventory

Search for items by name (case-insensitive substring match):

```bash
curl "http://localhost:3000/api/inventory/search?q=shoe"
```

Response:
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

---

### 3. Create Shopping Cart

Create a new shopping cart session:

```bash
curl -X POST http://localhost:3000/api/cart
```

Response:
```json
{
  "success": true,
  "cartId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Cart created successfully"
}
```

Save the `cartId` for the next steps.

---

### 4. Get Cart Summary

View your current cart:

```bash
curl http://localhost:3000/api/cart/{cartId}
```

Response (empty cart):
```json
{
  "success": true,
  "cart": {
    "items": [],
    "subtotal": 0,
    "tax": 0,
    "total": 0
  }
}
```

---

### 5. Add Item to Cart

Add an item to your cart:

```bash
curl -X POST http://localhost:3000/api/cart/{cartId}/items \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "SHOE_001",
    "quantity": 2
  }'
```

Response:
```json
{
  "success": true,
  "message": "Item added to cart",
  "cart": {
    "items": [
      {
        "id": "SHOE_001",
        "name": "Classic Running Shoes - Black",
        "price": 89.99,
        "quantity": 2
      }
    ],
    "subtotal": 179.98,
    "tax": 14.40,
    "total": 194.38
  }
}
```

---

### 6. Add Multiple Items

Search for more items and add them:

```bash
# Search for shirts
curl "http://localhost:3000/api/inventory/search?q=shirt"

# Add a shirt to cart
curl -X POST http://localhost:3000/api/cart/{cartId}/items \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "SHIRT_001",
    "quantity": 1
  }'
```

---

### 7. Remove Item from Cart

Remove an item completely:

```bash
curl -X DELETE http://localhost:3000/api/cart/{cartId}/items/SHIRT_001
```

Or remove partial quantity:

```bash
curl -X DELETE "http://localhost:3000/api/cart/{cartId}/items/SHOE_001?quantity=1"
```

Response:
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

---

### 8. Checkout

Process payment and create an order:

```bash
curl -X POST http://localhost:3000/api/cart/{cartId}/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "card",
    "amount": 97.19,
    "currency": "USD"
  }'
```

Response:
```json
{
  "success": true,
  "orderId": "mock-uuid-1234",
  "message": "Checkout successful",
  "order": {
    "orderId": "mock-uuid-1234",
    "total": 97.19,
    "createdAt": "2025-11-04T17:50:00.000Z"
  }
}
```

---

### 9. Retrieve Order Details

Get order information by order ID:

```bash
curl http://localhost:3000/api/orders/{orderId}
```

Response:
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
    "createdAt": "2025-11-04T17:50:00Z"
  }
}
```

---

### 10. Get User Orders

Retrieve all orders for a user:

```bash
curl http://localhost:3000/api/orders/user/default-user
```

Response:
```json
{
  "success": true,
  "orders": [
    {
      "orderId": "mock-uuid-1234",
      "total": 97.19,
      "createdAt": "2025-11-04T17:50:00Z"
    }
  ],
  "count": 1
}
```

---

## Complete Shopping Flow

Here's a complete end-to-end example:

```bash
#!/bin/bash

# 1. Search for shoes
SEARCH_RESULT=$(curl -s "http://localhost:3000/api/inventory/search?q=running")
echo "Search Result: $SEARCH_RESULT"

# 2. Create a cart
CART_RESULT=$(curl -s -X POST http://localhost:3000/api/cart)
CART_ID=$(echo $CART_RESULT | grep -o '"cartId":"[^"]*"' | cut -d'"' -f4)
echo "Cart ID: $CART_ID"

# 3. Add shoes to cart
curl -s -X POST http://localhost:3000/api/cart/$CART_ID/items \
  -H "Content-Type: application/json" \
  -d '{"itemId":"SHOE_001","quantity":1}' | jq .

# 4. View cart
curl -s http://localhost:3000/api/cart/$CART_ID | jq .

# 5. Checkout
CHECKOUT=$(curl -s -X POST http://localhost:3000/api/cart/$CART_ID/checkout \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"card","amount":97.19,"currency":"USD"}')
ORDER_ID=$(echo $CHECKOUT | grep -o '"orderId":"[^"]*"' | cut -d'"' -f4)
echo "Order ID: $ORDER_ID"

# 6. Get order details
curl -s http://localhost:3000/api/orders/$ORDER_ID | jq .
```

---

## Error Handling

The API returns appropriate HTTP status codes:

- **200 OK** - Success
- **400 Bad Request** - Invalid input
- **404 Not Found** - Resource not found
- **409 Conflict** - Business logic violation (e.g., insufficient inventory)
- **500 Internal Server Error** - Server error

All error responses follow this format:
```json
{
  "success": false,
  "error": "Error description"
}
```

---

## Notes

- **Carts are in-memory**: They are cleared when the server restarts
- **Inventory persists**: Stored in MongoDB, updates reflect inventory changes
- **Orders persist**: Stored in MongoDB with full purchase details
- **No authentication**: This is a demo API without auth/authZ
- **Fuzzy search**: Searches use case-insensitive substring matching

---

## API Specification

For complete API documentation, see: [specs/api.spec.md](./specs/api.spec.md)
