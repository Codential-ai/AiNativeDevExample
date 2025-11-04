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

- Validates item availability in inventory before adding
- Updates cart total when items are added
- Handles quantity updates for existing items in cart

### Remove Items from Cart

Allows customers to remove items from their shopping cart.

- Removes individual items or adjusts quantities
- Updates cart total when items are removed
- Handles complete item removal from cart

### Inventory Management

Manages the backend inventory of available items, persisted to MongoDB via Mongoose.

- Tracks item quantities and availability in MongoDB
- Updates inventory when items are reserved for carts
- Handles inventory restocking and item management
- Prevents overselling by checking available quantities
- Provides Mongoose schema and model for InventoryItem documents

### Checkout Process

Handles the checkout flow for completing purchases.

- Validates cart contents against current inventory
- Reserves items during checkout process
- Calculates final totals including taxes and fees
- Manages checkout session state
- Creates persistent Order record in MongoDB after successful payment

### Payment Processing

Processes payment transactions for completed orders.

- Integrates with payment providers for transaction processing
- Handles payment validation and authorization
- Manages payment success and failure scenarios
- Updates inventory after successful payment completion
- Persists order to database with complete purchase details

### Bulk Inventory Upload

Allows administrators to bulk import inventory items from CSV files.

- Parses CSV format with columns: id, name, price, availableQuantity
- Validates CSV data before importing to MongoDB
- Handles duplicate item IDs (skip or update based on configuration)
- Supports batch upsert operations for efficient MongoDB writes
- Returns import results with success/failure counts and detailed error reporting

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
  addItem(itemId: string, quantity: number): boolean;
  removeItem(itemId: string, quantity?: number): boolean;
  getCartSummary(): CartSummary;
  checkout(paymentDetails: PaymentDetails): Promise<CheckoutResult>;
}

class InventoryManager {
  // Query operations
  getAvailableItems(): Promise<InventoryItem[]>;
  getItemById(itemId: string): Promise<InventoryItem | null>;

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

## Test Cases

[@test](../test/shopping-cart.test.ts)

### ShoppingCart Tests

#### Add items to cart
- Given an empty shopping cart
- When adding an item with itemId "item1" and quantity 2
- Then the item should be added to the cart
- And addItem should return true

#### Add multiple items to cart
- Given an empty shopping cart
- When adding item "item1" with quantity 1
- And adding item "item2" with quantity 2
- Then getCartSummary should show 2 items
- And getCartSummary items should contain both items

#### Update existing item quantity
- Given a shopping cart with item "item1" quantity 1
- When adding the same item "item1" with quantity 2 again
- Then the total quantity for "item1" should be 3

#### Reject invalid quantity
- Given an empty shopping cart
- When adding an item with quantity 0 or negative
- Then addItem should return false
- And the item should not be added

#### Remove item completely
- Given a shopping cart with item "item1" quantity 3
- When removing "item1" without specifying quantity
- Then the item should be removed from cart
- And removeItem should return true

#### Remove partial quantity
- Given a shopping cart with item "item1" quantity 5
- When removing "item1" with quantity 2
- Then the item quantity should become 3
- And removeItem should return true

#### Remove non-existent item
- Given a shopping cart
- When removing an item that doesn't exist
- Then removeItem should return false

#### Calculate cart summary with tax
- Given a shopping cart with items subtotal 100
- When getting cart summary
- Then tax should be 8 (8% of 100)
- And total should be 108

### InventoryManager Tests

#### Get available items
- Given inventory with items in MongoDB
- When calling getAvailableItems
- Then should return all items with their quantities from database

#### Get single item by ID
- Given inventory with item "item1" in MongoDB
- When calling getItemById("item1")
- Then should return the item with matching ID

#### Get non-existent item
- Given an inventory
- When calling getItemById("nonexistent")
- Then should return null

#### Update inventory quantity
- Given item "item1" in inventory with quantity 10
- When calling updateInventory("item1", 5)
- Then the item quantity should update to 5 in MongoDB
- And updateInventory should return true

#### Update non-existent item
- Given an inventory
- When calling updateInventory("nonexistent", 10)
- Then updateInventory should return false

#### Reserve items successfully
- Given items in inventory with sufficient quantities
- When calling reserveItems with valid cart items
- Then reserveItems should return true
- And items should be marked as reserved

#### Fail to reserve insufficient items
- Given item "item1" in inventory with quantity 5
- When attempting to reserve 10 units of "item1"
- Then reserveItems should return false

#### Release reservation
- Given reserved items in inventory
- When calling releaseReservation
- Then items should no longer be reserved
- And quantities should be available again

### InventoryBulkUploader Tests

#### Successfully upload valid CSV
- Given a CSV with valid items: id, name, price, availableQuantity
- When calling bulkUploadFromCsv
- Then all items should be imported to MongoDB
- And result.success should be true
- And result.successCount should equal row count

#### Skip duplicate items
- Given existing item "dup1" in inventory
- And a CSV containing "dup1" with onDuplicate: 'skip'
- When calling bulkUploadFromCsv
- Then "dup1" should remain unchanged
- And result.successCount should include the skipped item

#### Update duplicate items
- Given existing item "dup1" with price 10
- And a CSV containing "dup1" with price 20 and onDuplicate: 'update'
- When calling bulkUploadFromCsv
- Then "dup1" should be updated with price 20
- And result.successCount should count this as success

#### Reject missing required fields
- Given a CSV with missing availableQuantity column
- When calling bulkUploadFromCsv
- Then result.success should be false
- And result.failureCount should be greater than 0
- And errors should contain details about missing fields

#### Reject invalid price
- Given a CSV with negative price or non-numeric price
- When calling bulkUploadFromCsv
- Then the row should fail
- And errors should specify "Invalid price"

#### Reject invalid quantity
- Given a CSV with negative quantity or non-numeric quantity
- When calling bulkUploadFromCsv
- Then the row should fail
- And errors should specify "Invalid availableQuantity"

#### Handle custom delimiter
- Given a CSV with semicolon delimiter
- When calling bulkUploadFromCsv with delimiter ';'
- Then items should be parsed correctly
- And result.success should be true

#### Parse mixed valid and invalid rows
- Given a CSV with 5 rows, 3 valid and 2 invalid
- When calling bulkUploadFromCsv
- Then result.totalProcessed should be 5
- And result.successCount should be 3
- And result.failureCount should be 2
- And result.errors should have 2 entries with row numbers