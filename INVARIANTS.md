### PROJ-001: All Read-Only Cart Queries Must Use .lean()

**Definition:**
Mongoose queries that only READ data (no modifications) must chain `.lean()` before `.exec()` to return plain JavaScript objects instead of full Mongoose documents.

**When to Apply:**
- ✅ Methods that only read data from Mongo using Mongoose 
- ❌ Any operation that calls `.save()` after fetch or performs an update on the result set

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

```

**_How to verify the invariant_**
  When reviewing, editing, or writing code that leverages Mongoose, if the query is read-only, it MUST be chained with .lean() before .exec(). If it is not, then modify the code to chain .lean() before .exec().

**_Remediation:_**
Agent:  rewrite the query to chain .lean() before .exec() in any method that violates this invariant.
