# Conference Demo: Invariants in Claude Code

**Duration: 7 minutes**

---

## Overview

This demo shows how invariants detect and remediate the 3 types of untestable bugs Jennifer mentioned. 
- **Too hard to test** (race conditions)
- **Too expensive to test** (performance characteristics)
- **Too complex to test** (combinatorial state explosion)

Each invariant is presented as:
1. The Problem (what breaks in generated code)
2. The Invariant (the rule we define)
3. The Fix (before/after code showing the solution)

---

## Opening Statement (30 seconds)

> "When we generate code from specs without invariants, we ship bugs that are incredibly hard to catch in testing. Let me show you how these 3 issues show up in this shopping cart application, and how invariants help us prevent them going forward. I generated this app using Claude Code with the Tessl Spec Registry to help Claude understand how to best use Mongoose. It is a NodeJS/Mongoose/Typescript application with a simple shopping cart that allows users to search for items, add items to their cart, and checkout. Claude helpfully generated a full set of unit tests for us, but as Jennifer mentioned, we know there are at least 3 untestable bugs lurking in the code.  

For each bug, I will show you how to structure an invariant at the right scope and then 3 techniques to enforce or verify the implementation.  There are absolutely different approaches to verify each invariant and my focus is on showing a variety of techniques to help showcase the power of the approach.  The best enforcement approach highly depends on your available time and the priority of the invariant. For example, Business critical invariants will require a higher level of verification whereas best-practices related invariants can be enforced at a lower level.   
"

---

# Demo 1: Race Conditions → Transactions (2 minutes)

## The Scenario (20 seconds)

Show a generated unit test that fail

**Timing Breakdown:**
- Setup: 10 sec
- Problem: 10 sec

```
Payment failure after the item quantity has already been deprecated --> stock is now off.   
```

**Presenter Note:** Here's a scenario where multiple users are looking to buy a high-demand item during a black Friday sale.  While the system is processing the payment for User A, User B looks to buy the same item.  To be ACID compliant while also supporting a high scale, we need to make sure we build in proper rollback logic. This applies universally, across this project and any other project.    Here's the sample code that shows the issue. 

---

## Before: The Vulnerable Code (25 seconds)

**File Location:** `src/services/ShoppingCart.ts` lines 146-157

```typescript
// ❌ NOT IN A TRANSACTION - VULNERABLE TO RACE CONDITIONS

async checkout(paymentDetails: PaymentDetails): Promise<CheckoutResult> {
  try {
    // ... validation code ...

    // CREATE ORDER
    const order = await this.orderService.createOrder(createOrderRequest);

    // [RACE CONDITION WINDOW - Another request could happen here]

    // UPDATE INVENTORY - Multiple separate operations
    for (const item of updatedCartItems) {
      const inventoryItem = await this.inventoryManager.getItemById(item.id);
      if (inventoryItem) {
        await this.inventoryManager.updateInventory(
          item.id,
          inventoryItem.availableQuantity - item.quantity
        );
      }
    }

    return { success: true, orderId: order.orderId };
  } catch (error) {
    return { success: false, error: 'Checkout failed' };
  }
}
```

**Presenter Note:** Highlight the separate `createOrder()` and `updateInventory()` calls. They're not atomic. 

---

## The Invariant (20 seconds)

### INV-001: All Destructive Operations Must Be Wrapped in Transactions

**Definition:**
Multi-document operations (create + update, or multiple updates across documents) must be wrapped in MongoDB transactions to prevent race conditions.

**When to Apply:**
- ✅ Any exported method that performs one or more Mongoose mutations (create, update, delete, updateOne, updateMany, deleteOne, deleteMany, etc.)
- ✅ Any exported method that calls other service methods performing mutations
- ✅ Any exported method orchestrating multiple operations across documents
- ❌ Read-only queries and fetch operations
- ❌ Exported methods that only perform single-document operations without risk of concurrent conflicts

**Rationale:**
Two concurrent requests must not both succeed if they would violate business logic. With transactions, MongoDB guarantees all-or-nothing atomicity.

** Example:**
```typescript
// ❌ INCORRECT - Multiple mutations without transaction
async exportedMethodName(parameters): Promise<ResultType> {
  try {
    // First mutation operation
    const result1 = await this.collection1.create(data);
    
    // Second mutation operation (vulnerable window here!)
    const result2 = await this.collection2.updateOne({ id: x }, { $set: data });
    
    return result1;
  } catch (error) {
    return handleError(error);
  }
}

// ✅ CORRECT - Wrap mutations in transaction
async exportedMethodName(parameters): Promise<ResultType> {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // First mutation operation - pass session
    const result1 = await this.collection1.create([data], { session });
    
    // Second mutation operation - pass session
    const result2 = await this.collection2.updateOne({ id: x }, { $set: data }, { session });
    
    await session.commitTransaction();
    return result1;
  } catch (error) {
    await session.abortTransaction();
    return handleError(error);
  } finally {
    session.endSession();
  }
}
```
---


## MCP Tool Output (15 seconds)

**Show this as a screenshot or transcript:**

```bash
/check-transactions

BEFORE:
❌ src/services/ShoppingCart.ts:31 - addItem() performs mutations (inventoryManager.getItemById + items.set) without transaction
❌ src/services/ShoppingCart.ts:62 - removeItem() performs mutations (items.delete/update) without transaction
❌ src/services/ShoppingCart.ts:89 - checkout() performs multiple mutations without transaction:
   - orderService.createOrder() at line 157
   - inventoryManager.updateInventory() at lines 163-166
   - items.clear() at line 171

3 violations found

AFTER APPLYING FIXES:
/check-transactions

✅ No violations found!

## After: Transaction-Safe Code (30 seconds)

**Same file, now wrapped in transaction:**

```typescript
// ✅ WRAPPED IN TRANSACTION - RACE CONDITION SAFE

async checkout(paymentDetails: PaymentDetails): Promise<CheckoutResult> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ... validation code ...

    // ALL OPERATIONS NOW USE THE SESSION
    const order = await this.orderService.createOrder(
      createOrderRequest,
      { session }  // ← Pass session
    );

    // UPDATE INVENTORY - ALL IN SAME TRANSACTION
    for (const item of updatedCartItems) {
      const inventoryItem = await this.inventoryManager.getItemById(
        item.id,
        { session }  // ← Pass session
      );
      if (inventoryItem) {
        await this.inventoryManager.updateInventory(
          item.id,
          inventoryItem.availableQuantity - item.quantity,
          { session }  // ← Pass session
        );
      }
    }

    // COMMIT ATOMICALLY
    await session.commitTransaction();
    return { success: true, orderId: order.orderId };

  } catch (error) {
    // ROLLBACK IF ANYTHING FAILS
    await session.abortTransaction();
    return { success: false, error: 'Checkout failed' };
  } finally {
    await session.endSession();
  }
}
```

**What Changed:**
1. Create session at start: `startSession()`
2. Begin transaction: `startTransaction()`
3. Pass `{ session }` to ALL database operations
4. Success path: `commitTransaction()` (atomic success)
5. Error path: `abortTransaction()` (atomic rollback)

**Presenter Note:** For this invariant, we will incorporate this language into a universal context file that is picked up by any agent for any project. Notice how when Claude Code was prompted to enforce the universal invariant, it correctly used the MCP tool to determine which methods needed the transaction wrappers. 

---

## Result (15 seconds)

**Before:** Sometimes both users succeed, sometimes only one user succeeds, and sometimes the entire transaction fails. 🔴

**After:** Only one user succeeds, other gets "Unable to reserve items" error ✅

**Key Benefit:** Impossible to double-sell. Inventory integrity guaranteed.

---

---

# Demo 2: Memory Waste → .lean() (2 minutes)

## The Scenario (20 seconds)

**Timing Breakdown:**
- Setup: 10 sec
- Problem: 10 sec

```
When we fetch orders for display, Mongoose returns full documents
with schema metadata, getters/setters, change tracking, and methods.

Then we immediately convert them to plain objects.

That metadata is 50%+ overhead we didn't need.

Scale: 10,000 orders = 8KB each = 80MB
       With .lean(): 4KB each = 40MB
       Savings: 40MB+ per query ⚡
```

**Presenter Note:** Mention that this isn't just about memory—it's also about speed. No hydration = instant return.  This is a Mongoose best practice applicable across this entire project.  Imagine a similar invariant for a project that uses a different storage layer or ORM. 

---

## Before: The Wasteful Code (25 seconds)

**File Location:** `src/services/OrderService.ts` lines 33-54

```typescript
// ❌ WASTEFUL - Returns full Mongoose documents for display

async getOrderById(orderId: string): Promise<Order | null> {
  const order = await OrderModel.findOne({ orderId }).exec();
  //                                                    ↑
  //                    Returns: Full Mongoose document (8KB)
  //                    Includes: _doc, __v, schema, $__, methods...

  return order ? (order.toObject() as unknown as Order) : null;
  //             ↑ Convert to plain object
  //             (We just wasted the overhead we fetched!)
}

async getUserOrders(userId: string): Promise<Order[]> {
  const orders = await OrderModel.find({ userId })
    .sort({ createdAt: -1 })
    .exec();
  //  ↑ Full documents again

  return orders.map(order => order.toObject() as unknown as Order);
  //                                ↑ Converting again
  //                                (Wasted overhead again!)
}

async getOrderByPaymentId(paymentId: string): Promise<Order | null> {
  const order = await OrderModel.findOne({ paymentId }).exec();
  return order ? (order.toObject() as unknown as Order) : null;
}
```

**Other Violations:**
- `InventoryManager.getAvailableItems()` line 16 - no `.lean()`
- `InventoryManager.getItemById()` line 28 - no `.lean()`
- `InventoryManager.reserveItems()` line 54 - no `.lean()` (reads for validation)
- `InventoryBulkUploader.bulkUploadFromCsv()` line 90 - no `.lean()` (duplicate check)

**Presenter Note:** Point out pattern—every method calls `.toObject()`. If we used `.lean()`, we wouldn't need it.

---

## The Invariant (20 seconds)

### PROJ-001: All Read-Only Cart Queries Must Use .lean()

**Definition:**
Mongoose queries that only READ data (no modifications) must chain `.lean()` before `.exec()` to return plain JavaScript objects instead of full Mongoose documents.

**When to Apply:**
- ✅ `getOrderById()` - only reads
- ✅ `getUserOrders()` - only reads
- ✅ `getAvailableItems()` - only reads
- ✅ `getItemById()` - only reads (for validation)
- ✅ `bulkUploadFromCsv()` - reads for duplicate check
- ❌ `createOrder()` - needs full document for `.save()`
- ❌ Any operation that calls `.save()` after fetch

**Rationale:**
For display/read-only operations, plain objects are sufficient and 50%+ faster. Mongoose overhead is wasted.

** Example:**
```typescript
// ❌ INCORRECT - Returns full Mongoose document
const order = await OrderModel.findOne({ orderId }).exec();
return order ? (order.toObject() as unknown as Order) : null;

// ✅ CORRECT - Returns plain object
const order = await OrderModel.findOne({ orderId }).lean().exec();
return order as Order | null;

---

## After: Optimized Code (30 seconds)

**Same methods, now with .lean():**

```typescript
// ✅ OPTIMIZED - Returns plain objects for display

async getOrderById(orderId: string): Promise<Order | null> {
  const order = await OrderModel.findOne({ orderId })
    .lean()  // ← ONE WORD FIX
    .exec();

  return order as Order | null;
  // ↑ Already plain object, no conversion needed!
}

async getUserOrders(userId: string): Promise<Order[]> {
  const orders = await OrderModel.find({ userId })
    .sort({ createdAt: -1 })
    .lean()  // ← ONE WORD FIX
    .exec();

  return orders as Order[];
  // ↑ Already plain objects!
}

async getOrderByPaymentId(paymentId: string): Promise<Order | null> {
  const order = await OrderModel.findOne({ paymentId })
    .lean()  // ← ONE WORD FIX
    .exec();

  return order as Order | null;
}
```

**Presenter Note:** Because this invariant is a best-practice, we will apply it via a prompt to the agent and trust the agent to apply .lean() correctly.  We can always extend the static analysis from the prior example to check this. 


---

# Demo 3: Orphaned References → Product Validation (1.5 minutes)

## The Scenario (20 seconds)

**Timing Breakdown:**
- Setup: 10 sec
- Problem: 10 sec

```
User adds a product to their cart. 
There is 1 item in stock, several reserved for other orders (which may not be fulfilled), and several more in transit. 
After deliberating for some time, the quantities have changed and the product is no longer available. 
At checkout, the user is still able to order the item because testing missed this scenario. 
```

**Presenter Note:** There is complicated business logic at play here.  The existing unit tests missed this scenario because they didn't properly account for the combination of user behavior + inventory. 

---

## Before: No Validation on Add (25 seconds)

**File Location:** `src/services/ShoppingCart.ts` lines 31-49

```typescript
// ❌ NO VALIDATION - Accepts non-existent products

addItem(itemId: string, quantity: number): boolean {
  if (quantity <= 0) return false;

  const existingItem = this.items.get(itemId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    // ❌ PROBLEM: No check that product exists!
    this.items.set(itemId, {
      id: itemId,
      name: '',          // ← Empty, we don't know the product
      price: 0,          // ← Zero
      quantity: quantity
    });
  }

  return true; // ← Always returns true, even for fake products!
}
```

**Problem Scenario:**
```typescript
describe('Inventory Race Condition with Reservations', () => {
  it('❌ FAILS - addItem does not account for reservations or abandoned carts', async () => {
    // Setup: Product X has 5 units, but 3 reserved, 2 in transit
    await InventoryItemModel.create({
      id: 'product-x',
      name: 'Widget',
      price: 29.99,
      availableQuantity: 5  // ← Only raw number, doesn't know about reservations
    });

    // User A adds 2 units to cart
    const cartA = new ShoppingCart(inventoryManager, orderService);
    expect(await cartA.addItem('product-x', 2)).toBe(true);  // ✅ Succeeds

    // User B adds 4 units to cart
    const cartB = new ShoppingCart(inventoryManager, orderService);
    expect(await cartB.addItem('product-x', 4)).toBe(true);  // ✅ Succeeds

    // User A abandons cart at 14:10 - but no cleanup of reservation!
    // cartA reservation for 2 units is never released

    // User B checks out at 14:15 - creates order for 4 units
    const resultB = await cartB.checkout(paymentDetails);
    expect(resultB.success).toBe(true);  // ✅ Order created

    // User A comes back at 14:25 and checks out for 2 units
    const resultA = await cartA.checkout(paymentDetails);
    
    // ❌ PROBLEM: This succeeds when it shouldn't!
    // System sold 6 units from inventory of 5 (+ 2 in transit)
    // Abandoned cart reservation was never cleaned up
    expect(resultA.success).toBe(false);  // ← But test shows it's true!
  });
});
```

**Presenter Note:** Point out that `addItem()` doesn't consider reservations, abandoned carts, or incoming stock. It only checks the `availableQuantity` field, which doesn't tell the full story of what inventory is actually available.

---

## The Invariant (20 seconds)

### CART-001: Cart Items Must Validate Product Existence

**Definition:**
Cart operations must validate that referenced products exist in the InventoryItem collection BEFORE storing them. Additionally, database-level hooks validate on save/update in case products are deleted after adding.

**When to Apply:**
- ✅ `ShoppingCart.addItem()` - validate before storing
- ✅ Cart save operations - validate all items before persisting
- ✅ Cart update operations - validate all items before persisting
- ✅ (Bonus) Product delete - optionally clean up affected carts

**Rationale:**
Prevents a number of issues that will arise as the system scales and its complexity increases. 

---

## After: With Validation (30 seconds)


### Pre-Save Hook (Defensive Layer)

**New or Updated:** `src/models/ShoppingCart.ts` (or wherever cart schema lives)

```typescript
// ✅ DATABASE-LEVEL VALIDATION

const cartSchema = new Schema({
  userId: String,
  items: [{
    itemId: String,
    quantity: Number,
    name: String,
    price: Number
  }]
});

// Validate on save
cartSchema.pre('save', async function(next) {
  // ✅ Validate all items reference existing products
  for (const item of this.items || []) {
    const exists = await InventoryItemModel.exists({ id: item.itemId });
    if (!exists) {
      throw new Error(`Product ${item.itemId} was deleted`);
    }
  }
  next();
});

// Validate on update
cartSchema.pre('updateOne', async function(next) {
  // ✅ Validate all items on update too
  const data = this.getUpdate();
  if (data.$set?.items) {
    for (const item of data.$set.items) {
      const exists = await InventoryItemModel.exists({ id: item.itemId });
      if (!exists) {
        throw new Error(`Product ${item.itemId} no longer exists`);
      }
    }
  }
  next();
});
```

**Presenter Note:** I intentionally omitted building out the addItem method for brevity-  there is a lot of business logic to be added to the spec.  But instead I focused on how to have the agent build in validation to the code as a backstop to all of the other potential scenarios. Now as we build the system out, we can rely on this code to trigger errors during checkout and avoid worse scenarios such as being unable to sell the items we have. 


---

# Closing Statement (30 seconds)

## Summary

| Invariant | Problem | Solution | Benefit |
|-----------|---------|----------|---------|
| **INV-001: Transactions** | Race conditions (double-sell) | Wrap multi-doc ops in sessions | Inventory integrity guaranteed |
| **PROJ-001: .lean()** | Memory waste (50%+) | Add `.lean()` to read-only queries | Performance scales correctly |
| **CART-001: Product Validation** | Orphaned references | Validate on add + pre-save hooks | Better UX + data integrity |

## The Big Idea

> "Invariants let us bake best practices into the spec-driven development process. Instead of discovering these bugs in production, we catch them during code generation. Claude Code helps us apply and verify them efficiently."

## Scaling

- ✅ Invariants live in `CLAUDE.md` instructions
- ✅ Passed to Tessl during code generation (in context)
- ✅ MCP tools verify compliance automatically
- ✅ Feature-specific, project-wide, and universal rules
- ✅ Works with existing spec-driven workflow

---

---

# Presenter Notes & Timing

## Overall Timing Breakdown

- **Opening**: 30 sec (introduce concept)
- **Demo 1 (Transactions)**: 2 min
  - Scenario: 20 sec
  - Before code: 25 sec
  - Invariant: 20 sec
  - After code: 30 sec
  - Result: 15 sec
- **Demo 2 (.lean)**: 2 min
  - Scenario: 20 sec
  - Before code: 25 sec
  - Invariant: 20 sec
  - After code: 30 sec
  - MCP tool output: 15 sec
- **Demo 3 (Product Validation)**: 1.5 min
  - Scenario: 20 sec
  - Before code: 25 sec
  - Invariant: 20 sec
  - After code: 30 sec
  - Test behavior: 10 sec
- **Closing**: 30 sec
- **Buffer**: 30 sec

**Total: 7 minutes exactly**
