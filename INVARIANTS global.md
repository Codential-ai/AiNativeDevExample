### INV-001: All Mutation Operations Must Be Wrapped in a Transaction to prevent Race Conditions

**Definition:**
Multi-document operations (create + update, or multiple updates across documents) or operations on a collection of documents must be wrapped in MongoDB transactions to prevent race conditions.

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

**_How to verify the invariant_**
  Verify this invariant on every method that performs a mutation on the database and on every time you create, review, or edit such a method. 
  1. Extract the method body from the code
  2. Call the `transaction_analyzer` MCP tool with the code
  3. If violations are returned:
     - Wrap all database operations in a Mongoose transaction
     - Ensure all mutations use { session } parameter
     - Add try/catch with commitTransaction/abortTransaction

  Example:
  - Tool: check_transactions
  - Input: The method code containing database operations
  - Expected: Empty violations array for safe code