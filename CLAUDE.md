# AI-Native Development with Invariants Demo

**Developer:**

## Application Overview

This is an e-commerce shopping cart application built with TypeScript, Express, MongoDB, and Mongoose. The application demonstrates how to implement **Invariants** in agent workflows to catch three categories of bugs that are difficult to test:

### Key Features
- **Inventory Management** - Track items in stock with MongoDB/Mongoose
- **Shopping Cart API** - Create and manage shopping carts with item reservations
- **Order Management** - Process orders and track payment states
- **Transaction Safety MCP Tool** - Validates Mongoose queries for race condition vulnerabilities

### Architecture
- **Backend:** Express.js with TypeScript
- **Database:** MongoDB with Mongoose ORM
- **Testing:** Jest with 100% code coverage (despite untestable bugs)
- **MCP Integration:** Custom transaction-analyzer tool for invariant validation

### Core Services
- `InventoryManager` - Handles inventory queries and reservations (line 52-71: vulnerable to race conditions)
- `ShoppingCart` - Manages cart operations and checkout flow
- `OrderService` - Processes orders and payment tracking
- `InventoryBulkUploader` - CSV-based inventory import

### Demo Scenarios
1. **Too Hard to Test** - Race conditions in concurrent reservations
2. **Too Expensive to Test** - Memory-inefficient Mongoose queries
3. **Too Complex to Test** - Combinatorial state explosion in cart validations

### Instructions for using Invariants
There are 3 levels of invariants in this project- universal, project-wide, and module-wide.  The universal invariant- INVARIANTS global.md is placed at the root of the project, so it applies to all projects and is available by default. The project-wide invariant is named INVARIANTS.md and is available in the root of the project.  This applies to this project only.  Module-wide invariants are placed in the `src/modules/shopping-cart/invariants/` directory and those apply to code within that module only. 

Prior to writing any code, the agents must check for all applicable invariants (based on scope) and fix any violations using the appropriate technique proscribed in the invariant file. 