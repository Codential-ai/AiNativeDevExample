### CART-001: Cart Items Must Validate Product Existence

**Definition:**
Before adding or updating a cart item, the system must validate that the referenced product exists in the InventoryItem collection. 


**When to Apply:**
- ✅ `ShoppingCart.addItem()` - validate before storing
- ✅ Cart save operations - validate all items before persisting
- ✅ Cart update operations - validate all items before persisting

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

### How to verify the invariant

Any operation on a Schema that modifies an Inventory Item, must have a pre-save and pre-update hook to verify the existence and validity of those InventoryItems. If they do not exist, then flag this operation and prompt the user to add the missing hooks. 