# E-Commerce Shopping Cart Demo: Invariants in Agent Workflows

A TypeScript-based e-commerce application demonstrating how to implement **Invariants** to catch untestable bugs in agent-generated code. Despite having 100% unit test coverage, this application contains three categories of subtle bugs that are prevented through structured invariant enforcement.

## Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas connection)
- pnpm (or npm)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string
```

### Running the Application

```bash
# Development mode
pnpm dev

# Production build
pnpm build
pnpm start

# Run tests
pnpm test
```

The API will start on `http://localhost:3000` with the following endpoints:

- `GET /health` - Health check
- `GET /api/inventory/search?q=query` - Search products
- `GET /api/inventory/:itemId` - Get product details
- `POST /api/cart` - Create shopping cart
- `POST /api/cart/:cartId/items` - Add items to cart
- `POST /api/cart/:cartId/checkout` - Checkout and create order

### Setting Up Your AI Agent

To follow along with this demo, set up your preferred coding agent (Claude Code, Cursor, or similar). We've provided a `CLAUDE.md` file with context about the application structure and its purpose.

**If using Claude Code:**
- The `CLAUDE.md` will be picked up automatically as project context
- It includes application overview, architecture, and pointer to the three bug scenarios

**If using another agent:**
- Copy the contents of `CLAUDE.md` into your agent's project context or system prompt
- This ensures the agent has the necessary context about the application
- You can also reference specific sections as needed

The application is designed to demonstrate how agents generate code with invariants in mind, catching bugs that would otherwise slip through perfect test coverage.

## Understanding the Demo

### The Three Bug Scenarios

#### 1. **Too Hard to Test: Race Conditions**
**File:** `src/services/InventoryManager.ts:52-71`

**Problem:** Two concurrent users buying the last item in stock could both succeed, resulting in overselling.

```typescript
async reserveItems(items: ShoppingCartItem[]): Promise<boolean> {
  // ❌ NOT IN A TRANSACTION - VULNERABLE TO RACE CONDITIONS
  for (const cartItem of items) {
    const inventoryItem = await InventoryItemModel.findOne({ id: cartItem.id }).exec();
    // Race condition happens here between read and update
    await InventoryItemModel.updateOne(...).exec();
  }
}
```

**Invariant Approach:** Use the MCP `transaction-analyzer` tool to validate all database operations are wrapped in transactions.

---

#### 2. **Too Expensive to Test: Memory Inefficiency**
**File:** `src/services/InventoryManager.ts:27-37`

**Problem:** Mongoose documents maintain overhead. Converting with `toObject()` after executing queries bloats memory.

```typescript
async getItemById(itemId: string): Promise<InventoryItem | null> {
  // ❌ INEFFICIENT: Returns full Mongoose document, then converts
  const item = await InventoryItemModel.findOne({ id: itemId }).exec();
  if (!item) return null;
  const obj = item.toObject() as unknown as InventoryItem;  // Memory waste
}
```

**Invariant Approach:** Code review to ensure `.lean()` is used for all queries returning plain objects.

---

#### 3. **Too Complex to Test: State Explosion**
**File:** `src/services/ShoppingCart.ts`

**Problem:** Multiple validations in cart operations create combinatorial complexity. It's impossible to test all state combinations (item exists, quantity sufficient, reserved by others, etc.).

**Invariant Approach:** Add pre-update and pre-save hooks to Mongoose schemas to enforce consistency invariants at the database layer.

---

## Invariant Files

Invariant definitions are placed in the Claude home directory (`.claude/invariants/`) and project directories:

### Universal Scope (Global)
- **Location:** `~/.claude/invariants/transaction-safety.md`
- **Applies to:** All projects
- **Scope:** Critical database transaction handling

### Project Scope
- **Location:** `./invariants/` (root of project)
- **Applies to:** All Mongoose usage in this project
- **Scope:** Best practices like `.lean()` usage

### Module Scope
- **Location:** `./src/modules/shopping-cart/invariants/`
- **Applies to:** ShoppingCart operations only
- **Scope:** Module-specific consistency rules

## Working with Invariants

### Claude Code Integration

When using Claude Code to generate or review code:

1. **Check Invariant Compliance:**
   ```
   Check all InventoryManager methods for transaction safety using the
   transaction-analyzer MCP tool. Fix any violations.
   ```

2. **Code Review for Best Practices:**
   ```
   Review all Mongoose queries for proper use of .lean() and suggest
   improvements where memory efficiency can be improved.
   ```

3. **Add Validation Hooks:**
   ```
   Add pre-save hooks to all InventoryItem operations to validate
   inventory consistency (total reserved <= available quantity).
   ```

### MCP Tool Usage

The project includes a custom MCP tool for transaction analysis:

```bash
# Tool: transaction-analyzer
# Analyzes TypeScript/JavaScript code for race condition vulnerabilities
# Used by Claude Code to validate transaction safety
```

## Project Structure

```
├── src/
│   ├── services/
│   │   ├── InventoryManager.ts       # Inventory operations (has issues)
│   │   ├── ShoppingCart.ts            # Cart operations
│   │   ├── OrderService.ts            # Order processing
│   │   └── InventoryBulkUploader.ts   # CSV import utility
│   ├── models/
│   │   ├── InventoryItem.ts           # Mongoose schema
│   │   └── Order.ts                   # Order schema
│   ├── routes/
│   │   ├── inventory.ts               # Inventory endpoints
│   │   ├── cart.ts                    # Cart endpoints
│   │   └── orders.ts                  # Order endpoints
│   ├── types/
│   │   └── index.ts                   # TypeScript interfaces
│   └── server.ts                      # Express app setup
├── test/
│   ├── shopping-cart.test.ts          # Cart tests
│   └── orders.test.ts                 # Order tests
├── mcp/
│   └── transaction-analyzer.ts        # MCP tool for validating transactions
├── scripts/
│   ├── start-server.ts                # Server startup
│   └── upload-inventory.ts            # Bulk upload script
└── CONFERENCE_DEMO.md                 # Full demo script with timing

```

## Running the Demo

See `CONFERENCE_DEMO.md` for the full conference presentation script with timing and exact code locations to reference.

### Demo Walkthrough

1. **Show the Issue:** Highlight the race condition in `InventoryManager.reserveItems`
2. **Run Invariant Check:** Use Claude Code with the transaction-analyzer tool
3. **Review Code:** Show the inefficient Mongoose query pattern
4. **Generate Fix:** Prompt Claude Code to add `.lean()` optimization
5. **Validate:** Show that new generated code follows the invariant

## Technology Stack

- **Runtime:** TypeScript + Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose ODM
- **Testing:** Jest
- **Build:** tsc (TypeScript Compiler)
- **CLI:** tsx for TypeScript execution

## Key Takeaways

1. **Invariants structure requirements at multiple scopes** - Global, project-wide, and module-specific
2. **Three verification techniques exist** - MCP tools, code review, and hooks/middleware
3. **Agent-generated code improves with explicit constraints** - Even with perfect test coverage, invariants catch bugs agents and humans miss
4. **Invariants are executable** - Not just documentation; can be verified programmatically

## Further Reading

- `CONFERENCE_DEMO.md` - Full conference presentation script
- `CLAUDE.md` - Application overview for Claude Code context
