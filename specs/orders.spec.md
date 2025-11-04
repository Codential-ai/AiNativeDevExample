# Orders Management System

Order management system that stores completed purchase orders in MongoDB with full order details including items, quantities, pricing, customer information, and payment data.

## Architecture

The Orders system follows the standard Next.js directory structure with clear separation of concerns:

### Directory Structure

```
src/
├── types/
│   └── orders.ts             # TypeScript interfaces for orders
├── models/
│   └── Order.ts              # Mongoose schema and model
└── services/
    └── OrderService.ts       # Order management business logic
```

## Target

[@generate](../src/types/orders.ts)
[@generate](../src/models/Order.ts)
[@generate](../src/services/OrderService.ts)

## Capabilities

### Create Orders from Checkout

Stores a completed purchase order in MongoDB after successful payment.

- Captures complete order details including items, quantities, and prices
- Records customer/user identifier for order tracking
- Stores payment information and confirmation ID
- Automatically timestamps order creation
- Calculates and persists total order price with taxes
- Links to original inventory items for reference

### Retrieve Orders

Fetches orders from MongoDB by various criteria.

- Query orders by order ID
- Retrieve orders by user/customer identifier
- Get complete order history for a user
- Access order details with full line items

### Order History and Tracking

Provides comprehensive order tracking capabilities.

- Returns orders ordered by most recent first
- Includes complete audit trail with timestamps
- Preserves historical price information per item
- Maintains reference to inventory items at time of purchase

## API

```typescript { .api }
interface OrderItem {
  inventoryItemId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  _id?: string;
  orderId: string;
  userId: string;
  paymentId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CreateOrderRequest {
  userId: string;
  paymentId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
}

interface OrderQueryResult {
  success: boolean;
  order?: Order;
  orders?: Order[];
  error?: string;
}

class OrderService {
  createOrder(request: CreateOrderRequest): Promise<Order>;
  getOrderById(orderId: string): Promise<Order | null>;
  getOrderByPaymentId(paymentId: string): Promise<Order | null>;
  getUserOrders(userId: string): Promise<Order[]>;
}
```

## Dependencies

### Database

MongoDB object modeling via Mongoose ODM for schema validation and query building.
[@use](mongoose)

### UUID Generation

Generate unique identifiers for orders.
[@use](uuid)

## Test Cases

[@test](../test/orders.test.ts)

### Order Creation Tests

#### Create order successfully
- Given valid order details with items and pricing
- When calling createOrder
- Then order should be created in MongoDB
- And order should have unique orderId
- And createdAt timestamp should be set
- And returned order should contain all provided data

#### Create order with multiple items
- Given order with 5 different inventory items
- When calling createOrder
- Then all items should be saved in order
- And order total should equal sum of item subtotals plus tax

#### Order has correct financial totals
- Given order items with known prices and quantities
- When creating order
- Then subtotal should match sum of (price × quantity) for all items
- And tax should be calculated correctly
- And total should equal subtotal + tax

### Order Retrieval Tests

#### Retrieve order by ID
- Given order created and saved in MongoDB
- When calling getOrderById with the order ID
- Then should return the exact order with all details
- And returned order should have same structure as created

#### Retrieve non-existent order by ID
- Given an invalid order ID
- When calling getOrderById
- Then should return null
- And no error should be thrown

#### Retrieve order by payment ID
- Given order with specific paymentId
- When calling getOrderByPaymentId
- Then should return the order
- And returned order should have matching paymentId

#### Retrieve non-existent order by payment ID
- Given an invalid payment ID
- When calling getOrderByPaymentId
- Then should return null

### User Order History Tests

#### Get all orders for user
- Given a user with multiple orders
- When calling getUserOrders with userId
- Then should return all orders for that user
- And orders should be sorted by most recent first

#### Get orders for user with no orders
- Given a userId with no associated orders
- When calling getUserOrders
- Then should return empty array

#### User orders contain complete details
- Given orders retrieved for a user
- When examining order structure
- Then each order should have: orderId, userId, paymentId, items array, totals
- And all financial values should be accurate

### Order Data Integrity Tests

#### Preserves item pricing at time of purchase
- Given order with items at specific prices
- When inventory prices change after order creation
- Then order should retain original prices
- And order pricing should be independent of current inventory

#### Stores order line items correctly
- Given order with items containing: name, price, quantity
- When creating order
- Then all item details should be persisted
- And item subtotal should be correctly calculated per item

#### Order totals are immutable
- Given completed order with calculated totals
- When retrieving the order
- Then subtotal, tax, and total should remain unchanged
- And totals should not recalculate on retrieval
