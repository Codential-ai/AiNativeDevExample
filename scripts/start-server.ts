/**
 * E-Commerce API Server Startup Script
 *
 * Starts the Express server with MongoDB connection
 *
 * Usage:
 *   npx tsx scripts/start-server.ts
 *
 * Environment:
 *   Requires MONGO_DB_URL in .env.local
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { InventoryManager } from '../src/services/InventoryManager';
import { OrderService } from '../src/services/OrderService';
import { createServer, startServer } from '../src/server';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const MONGO_DB_URL = process.env.MONGO_DB_URL || 'mongodb://localhost:27017/shopping-cart';

async function main() {
  try {
    console.log('🔄 Starting E-Commerce API Server...');
    console.log('');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URL: ${MONGO_DB_URL.substring(0, 50)}...`);

    await mongoose.connect(MONGO_DB_URL);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Initialize services
    console.log('🔧 Initializing services...');
    const inventoryManager = new InventoryManager();
    const orderService = new OrderService();
    console.log('✅ Services initialized');
    console.log('');

    // Create and start server
    console.log(`🚀 Starting Express server on port ${PORT}...`);
    const app = createServer({
      port: PORT,
      inventoryManager,
      orderService
    });

    startServer(app, PORT);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n');
      console.log('⏹️  Shutting down gracefully...');
      await mongoose.disconnect();
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(error);
    }

    // Check for common issues
    if (error instanceof Error && error.message.includes('ENOTFOUND')) {
      console.error('');
      console.error('💡 Hint: Make sure MongoDB is running and MONGO_DB_URL is correct in .env.local');
    }

    process.exit(1);
  }
}

// Run the server
main();
