# Shopping Cart Application

Shopping cart application that manages inventory, handles customer shopping experiences, and processes checkout with payment flows.

## Architecture

The application follows a standard Next.js directory structure with clear separation of concerns:

### Directory Structure

```
src/
├── types/
│   └── index.ts              # TypeScript interfaces and types
├── models/
│   └── InventoryItem.ts      # Mongoose schema and model
├── services/
│   ├── InventoryManager.ts   # Inventory management business logic
│   ├── InventoryBulkUploader.ts  # CSV bulk import service
│   └── ShoppingCart.ts       # Shopping cart and checkout logic
└── shopping-cart.ts          # Main export file (index)
```

### Design Patterns

- **Types**: All TypeScript interfaces and data models centralized in `src/types/`
- **Models**: Mongoose schemas and models in `src/models/`
- **Services**: Business logic classes in `src/services/`
- **Exports**: Main `src/shopping-cart.ts` re-exports all public APIs

## Target

[@generate](../src/shopping-cart.ts)  
[@generate](../src/types/index.ts)  
[@generate](../src/models/InventoryItem.ts)  
[@generate](../src/services/InventoryManager.ts)  
[@generate](../src/services/InventoryBulkUploader.ts)  
[@generate](../src/services/ShoppingCart.ts)  

## Capabilities

### Add Items to Cart

Allows customers to add items to their shopping cart with specified quantities.

- Fetches full item details (name, price) from inventory using InventoryManager.getItemById before adding [@test](../test/shopping-cart.test.ts)
- Validates item availability in inventory before adding [@test](../test/shopping-cart.test.ts)
- Updates cart total when items are added [@test](../test/shopping-cart.test.ts)
- Handles quantity updates for existing items in cart [@test](../test/shopping-cart.test.ts)

### Remove Items from Cart

Allows customers to remove items from their shopping cart.

- Removes individual items or adjusts quantities [@test](../test/shopping-cart.test.ts)
- Updates cart total when items are removed [@test](../test/shopping-cart.test.ts)
- Handles complete item removal from cart [@test](../test/shopping-cart.test.ts)

### Inventory Management

Manages the backend inventory of available items, persisted to MongoDB via Mongoose.

- Tracks item quantities and availability in MongoDB [@test](../test/shopping-cart.test.ts)
- Updates inventory when items are reserved for carts [@test](../test/shopping-cart.test.ts)
- Handles inventory restocking and item management [@test](../test/shopping-cart.test.ts)
- Prevents overselling by checking available quantities [@test](../test/shopping-cart.test.ts)
- Provides Mongoose schema and model for InventoryItem documents [@test](../test/shopping-cart.test.ts)
- Allows filtering items by price to find budget-friendly inventory [@test](../test/shopping-cart.test.ts)

### Checkout Process

Handles the checkout flow for completing purchases.

- Validates cart contents against current inventory [@test](../test/shopping-cart.test.ts)
- Reserves items during checkout process [@test](../test/shopping-cart.test.ts)
- Calculates final totals including taxes and fees [@test](../test/shopping-cart.test.ts)
- Manages checkout session state [@test](../test/shopping-cart.test.ts)
- Creates persistent Order record in MongoDB after successful payment [@test](../test/shopping-cart.test.ts)

### Payment Processing

Processes payment transactions for completed orders.

- Integrates with payment providers for transaction processing [@test](../test/shopping-cart.test.ts)
- Handles payment validation and authorization [@test](../test/shopping-cart.test.ts)
- Manages payment success and failure scenarios [@test](../test/shopping-cart.test.ts)
- Updates inventory after successful payment completion [@test](../test/shopping-cart.test.ts)
- Persists order to database with complete purchase details [@test](../test/shopping-cart.test.ts)

### Bulk Inventory Upload

Allows administrators to bulk import inventory items from CSV files.

- Parses CSV format with columns: id, name, price, availableQuantity [@test](../test/shopping-cart.test.ts)
- Validates CSV data before importing to MongoDB [@test](../test/shopping-cart.test.ts)
- Handles duplicate item IDs (skip or update based on configuration) [@test](../test/shopping-cart.test.ts)
- Supports batch upsert operations for efficient MongoDB writes [@test](../test/shopping-cart.test.ts)
- Returns import results with success/failure counts and detailed error reporting [@test](../test/shopping-cart.test.ts)

## API

```typescript { .api }
interface ShoppingCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface InventoryItem {
  _id?: string;
  id: string;
  name: string;
  price: number;
  availableQuantity: number;
  createdAt?: Date;
  updatedAt?: Date;
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

interface BulkUploadResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: { row: number; message: string }[];
}

class ShoppingCart {
  constructor(inventoryManager: InventoryManager, orderService: OrderService);
  addItem(itemId: string, quantity: number): Promise<boolean>;
  removeItem(itemId: string, quantity?: number): boolean;
  getCartSummary(): CartSummary;
  checkout(paymentDetails: PaymentDetails): Promise<CheckoutResult>;
}

class InventoryManager {
  // Query operations
  getAvailableItems(): Promise<InventoryItem[]>;
  getItemById(itemId: string): Promise<InventoryItem | null>;
  getItemsBelowPrice(maxPrice: number): Promise<InventoryItem[]>;

  // Inventory updates
  updateInventory(itemId: string, quantity: number): Promise<boolean>;
  reserveItems(items: ShoppingCartItem[]): Promise<boolean>;
  releaseReservation(items: ShoppingCartItem[]): Promise<void>;
}

class InventoryBulkUploader {
  bulkUploadFromCsv(csvContent: string, options?: BulkUploadOptions): Promise<BulkUploadResult>;
}

interface BulkUploadOptions {
  onDuplicate?: 'skip' | 'update';
  delimiter?: string;
}
```

## Dependencies

### Database

MongoDB object modeling via Mongoose ODM for schema validation and query building.  
[@use](mongoose)

### Payment Processing

External payment service for handling transactions.  
[@use](stripe)

### CSV Parsing

Utility for parsing CSV data during bulk inventory imports.  
[@use](csv-parse)

### Internal Services

ShoppingCart integrates with OrderService to persist completed orders to MongoDB after successful checkout.

## API Integration

The ShoppingCart service is exposed via RESTful API endpoints defined in a separate spec.  
[@see](./api.spec.md)