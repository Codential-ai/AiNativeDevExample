/**
 * Express server setup for E-Commerce API
 * Mounts all API routes and middleware
 */

import express from 'express';
import { InventoryManager } from './services/InventoryManager';
import { OrderService } from './services/OrderService';
import { createInventoryRoutes } from './routes/inventory';
import { createCartRoutes } from './routes/cart';
import { createOrderRoutes } from './routes/orders';

export interface ServerConfig {
  port: number;
  inventoryManager: InventoryManager;
  orderService: OrderService;
}

export function createServer(config: ServerConfig): express.Application {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS headers (for demo)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount API routes
  app.use('/api/inventory', createInventoryRoutes(config.inventoryManager));
  app.use('/api/cart', createCartRoutes(config.inventoryManager, config.orderService));
  app.use('/api/orders', createOrderRoutes(config.orderService));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      path: req.path
    });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  });

  return app;
}

export function startServer(app: express.Application, port: number): void {
  app.listen(port, () => {
    console.log(`🚀 E-Commerce API Server running on http://localhost:${port}`);
    console.log(`📚 API Documentation: specs/api.spec.md`);
    console.log(`\n📍 Available endpoints:`);
    console.log(`   GET    /health                           - Health check`);
    console.log(`   GET    /api/inventory/search?q=query    - Search inventory`);
    console.log(`   GET    /api/inventory/:itemId           - Get item details`);
    console.log(`   POST   /api/cart                        - Create cart`);
    console.log(`   GET    /api/cart/:cartId                - Get cart summary`);
    console.log(`   POST   /api/cart/:cartId/items          - Add item to cart`);
    console.log(`   DELETE /api/cart/:cartId/items/:itemId  - Remove item from cart`);
    console.log(`   POST   /api/cart/:cartId/checkout       - Checkout and create order`);
    console.log(`   GET    /api/orders/:orderId             - Get order details`);
    console.log(`   GET    /api/orders/user/:userId         - Get user orders`);
    console.log(`   GET    /api/orders/payment/:paymentId   - Get order by payment ID`);
  });
}
