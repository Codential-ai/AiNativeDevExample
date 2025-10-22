# Shopping Cart Application

Shopping cart application that manages inventory, handles customer shopping experiences, and processes checkout with payment flows.

## Target

[@generate](../src/shopping-cart.ts)

## Capabilities

### Add Items to Cart

Allows customers to add items to their shopping cart with specified quantities.

- Validates item availability in inventory before adding
- Updates cart total when items are added
- Handles quantity updates for existing items in cart

### Remove Items from Cart

Allows customers to remove items from their shopping cart.

- Removes individual items or adjusts quantities
- Updates cart total when items are removed
- Handles complete item removal from cart

### Inventory Management

Manages the backend inventory of available items.

- Tracks item quantities and availability
- Updates inventory when items are reserved for carts
- Handles inventory restocking and item management
- Prevents overselling by checking available quantities

### Checkout Process

Handles the checkout flow for completing purchases.

- Validates cart contents against current inventory
- Reserves items during checkout process
- Calculates final totals including taxes and fees
- Manages checkout session state

### Payment Processing

Processes payment transactions for completed orders.

- Integrates with payment providers for transaction processing
- Handles payment validation and authorization
- Manages payment success and failure scenarios
- Updates inventory after successful payment completion

## API

```typescript { .api }
interface ShoppingCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  availableQuantity: number;
}

interface CartSummary {
  items: ShoppingCartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

interface PaymentDetails {
  paymentMethod: string;
  amount: number;
  currency: string;
}

interface CheckoutResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

class ShoppingCart {
  addItem(itemId: string, quantity: number): boolean;
  removeItem(itemId: string, quantity?: number): boolean;
  getCartSummary(): CartSummary;
  checkout(paymentDetails: PaymentDetails): Promise<CheckoutResult>;
}

class InventoryManager {
  getAvailableItems(): InventoryItem[];
  getItemById(itemId: string): InventoryItem | null;
  updateInventory(itemId: string, quantity: number): boolean;
  reserveItems(items: ShoppingCartItem[]): boolean;
  releaseReservation(items: ShoppingCartItem[]): void;
}
```

## Dependencies

### Payment Processing

External payment service for handling transactions.
[@use](stripe)