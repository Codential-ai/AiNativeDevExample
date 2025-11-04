# Inventory Management Scripts

## Upload Inventory from CSV

This script imports inventory items from a CSV file into MongoDB using the `InventoryBulkUploader` class.

### Prerequisites

- MongoDB running and accessible
- `.env.local` file with `MONGO_DB_URL` set (see Environment Configuration below)
- All dependencies installed (`pnpm install`)

### Usage

```bash
# Using default CSV file (./inventory.csv) and skip duplicate handling
npx tsx scripts/upload-inventory.ts

# Specify custom CSV file
npx tsx scripts/upload-inventory.ts ./path/to/inventory.csv

# Specify CSV file and update duplicate handling
npx tsx scripts/upload-inventory.ts ./inventory.csv update
```

### Parameters

- **csvFilePath** (optional, default: `./inventory.csv`)
  - Path to the CSV file containing inventory items
  - Can be relative or absolute path

- **onDuplicate** (optional, default: `skip`)
  - How to handle items that already exist in the database
  - `skip` - Keep existing items, ignore duplicates in CSV
  - `update` - Overwrite existing items with CSV data

### CSV Format

The CSV file must have the following columns (in any order):

```
id,name,price,availableQuantity
ITEM_001,Product Name,99.99,100
```

- **id** - Unique identifier for the item (string, required)
- **name** - Product name (string, required)
- **price** - Price in dollars (number, required, must be >= 0)
- **availableQuantity** - Available stock count (integer, required, must be >= 0)

### Example CSV

```csv
id,name,price,availableQuantity
SHOE_001,Classic Running Shoes - Black,89.99,150
SHIRT_001,Oxford Button-Up Shirt - Blue,59.99,100
HAT_001,Classic Baseball Cap - Black,29.99,350
```

### Output

The script provides detailed feedback including:
- Connection status
- File reading status
- Upload progress
- Summary of processed items (successful/failed counts)
- Detailed error messages with row numbers for failed items

### Example Output

```
🚀 Starting inventory upload...
📁 CSV file: ./inventory.csv
🗄️  MongoDB: mongodb://localhost:27017/shopping-cart
⚙️  Duplicate handling: skip

🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📖 Reading CSV file...
✅ CSV file read successfully

⏳ Processing and uploading inventory items...

📊 Upload Results:
  Total Processed: 100
  ✅ Successful: 100
  ❌ Failed: 0
  Status: ✅ SUCCESS

🎉 Upload complete!
```

### Troubleshooting

**Error: "CSV file not found"**
- Check the file path is correct
- Use absolute path if relative path doesn't work
- Ensure file exists: `ls -la ./inventory.csv`

**Error: "Neither apiKey nor config.authenticator provided"**
- This is expected if STRIPE_SECRET_KEY environment variable is not set
- The uploader itself doesn't require Stripe, only ShoppingCart checkout does

**Error: "Exceeded timeout"**
- MongoDB might not be running
- Check MongoDB connection: `mongosh` or `mongo`
- Ensure connection string is correct in `MONGO_DB_URL`

**Error: "MONGO_DB_URL not found in .env.local"**
- Ensure `.env.local` file exists in project root
- Add `MONGO_DB_URL=<your-mongodb-uri>` to the file
- Example: `MONGO_DB_URL=mongodb+srv://user:pass@cluster.mongodb.net/db`

**Errors on specific rows**
- Check CSV format matches specification
- Verify prices are non-negative numbers
- Verify quantities are non-negative integers
- Check for missing required fields

### Environment Configuration

The script reads the MongoDB connection URI from `.env.local` file in the project root.

**Create or update `.env.local`:**
```
MONGO_DB_URL=mongodb+srv://user:password@cluster.mongodb.net/database-name
```

**Examples:**

Local MongoDB:
```
MONGO_DB_URL=mongodb://localhost:27017/shopping-cart
```

MongoDB Atlas:
```
MONGO_DB_URL=mongodb+srv://user:password@cluster.mongodb.net/database-name
```

The `.env.local` file is automatically loaded by the script using `dotenv`.

### Exit Codes

- `0` - Upload successful
- `1` - Upload failed or error occurred
