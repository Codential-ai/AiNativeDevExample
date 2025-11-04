/**
 * Upload inventory items from CSV file to MongoDB
 *
 * Usage: npx tsx scripts/upload-inventory.ts [csvFilePath] [onDuplicate]
 *
 * Arguments:
 *   csvFilePath - Path to CSV file (default: ./inventory.csv)
 *   onDuplicate - How to handle duplicates: 'skip' or 'update' (default: 'skip')
 *
 * Examples:
 *   npx tsx scripts/upload-inventory.ts
 *   npx tsx scripts/upload-inventory.ts ./inventory.csv skip
 *   npx tsx scripts/upload-inventory.ts ./inventory.csv update
 *
 * Environment:
 *   Uses MONGO_DB_URL from .env.local (loads via dotenv)
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { InventoryBulkUploader } from '../src/shopping-cart';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function uploadInventory() {
  // Parse command line arguments
  const csvFilePath = process.argv[2] || './inventory.csv';
  const onDuplicate = (process.argv[3] || 'skip') as 'skip' | 'update';

  // Validate onDuplicate argument
  if (!['skip', 'update'].includes(onDuplicate)) {
    console.error('Error: onDuplicate must be either "skip" or "update"');
    process.exit(1);
  }

  // Resolve file path
  const resolvedPath = path.resolve(csvFilePath);

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: CSV file not found at ${resolvedPath}`);
    process.exit(1);
  }

  // Get MongoDB connection URI from environment (.env.local or MONGO_DB_URL env var)
  const mongoUri = process.env.MONGO_DB_URL;

  if (!mongoUri) {
    console.error('Error: MONGO_DB_URL not found in .env.local or environment variables');
    console.error('Please create .env.local with: MONGO_DB_URL=<your-mongodb-uri>');
    process.exit(1);
  }

  console.log('🚀 Starting inventory upload...');
  console.log(`📁 CSV file: ${resolvedPath}`);
  console.log(`🗄️  MongoDB: ${mongoUri.substring(0, 40)}...`);
  console.log(`⚙️  Duplicate handling: ${onDuplicate}`);
  console.log('');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Read CSV file
    console.log('📖 Reading CSV file...');
    const csvContent = fs.readFileSync(resolvedPath, 'utf-8');
    console.log('✅ CSV file read successfully');
    console.log('');

    // Create uploader and process CSV
    console.log('⏳ Processing and uploading inventory items...');
    const uploader = new InventoryBulkUploader();
    const result = await uploader.bulkUploadFromCsv(csvContent, { onDuplicate });

    console.log('');
    console.log('📊 Upload Results:');
    console.log(`  Total Processed: ${result.totalProcessed}`);
    console.log(`  ✅ Successful: ${result.successCount}`);
    console.log(`  ❌ Failed: ${result.failureCount}`);
    console.log(`  Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);

    // Show errors if any
    if (result.errors.length > 0) {
      console.log('');
      console.log('⚠️  Errors:');
      result.errors.forEach((error) => {
        console.log(`  Row ${error.row}: ${error.message}`);
      });
    }

    console.log('');
    console.log('🎉 Upload complete!');

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('');
    console.error('❌ Error during upload:');
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
      if (error.stack) {
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('  An unknown error occurred');
    }
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    try {
      await mongoose.disconnect();
      console.log('');
      console.log('🔌 Disconnected from MongoDB');
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
  }
}

// Run the upload
uploadInventory();
