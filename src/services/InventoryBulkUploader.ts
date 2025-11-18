
import { parse } from 'csv-parse';
import { InventoryItem, BulkUploadResult, BulkUploadOptions } from '../types';
import { InventoryItemModel } from '../models/InventoryItem';

export class InventoryBulkUploader {
  async bulkUploadFromCsv(csvContent: string, options: BulkUploadOptions = {}): Promise<BulkUploadResult> {
    const { onDuplicate = 'skip', delimiter = ',' } = options;
    const result: BulkUploadResult = {
      success: true,
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      errors: []
    };

    return new Promise((resolve) => {
      const records: any[] = [];
      const parser = parse({
        columns: true,
        delimiter,
        skip_empty_lines: true,
        trim: true
      });

      parser.on('readable', function() {
        let record;
        while (record = parser.read()) {
          records.push(record);
        }
      });

      parser.on('error', function(err: Error) {
        result.success = false;
        result.errors.push({ row: 0, message: `CSV parsing error: ${err.message}` });
        resolve(result);
      });

      parser.on('end', async () => {
        result.totalProcessed = records.length;

        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const rowNum = i + 2; // +2 because row 1 is headers and arrays are 0-indexed

          try {
            // Validate required fields
            if (!record.id || !record.name || record.price === undefined || record.availableQuantity === undefined) {
              result.failureCount++;
              result.errors.push({
                row: rowNum,
                message: 'Missing required fields: id, name, price, availableQuantity'
              });
              continue;
            }

            // Validate data types
            const price = parseFloat(record.price);
            const availableQuantity = parseInt(record.availableQuantity);

            if (isNaN(price) || price < 0) {
              result.failureCount++;
              result.errors.push({
                row: rowNum,
                message: 'Invalid price'
              });
              continue;
            }

            if (isNaN(availableQuantity) || availableQuantity < 0) {
              result.failureCount++;
              result.errors.push({
                row: rowNum,
                message: 'Invalid availableQuantity'
              });
              continue;
            }

            const inventoryItem: Partial<InventoryItem> = {
              id: record.id.trim(),
              name: record.name.trim(),
              price,
              availableQuantity
            };

            // Check for duplicates
            const existingItem = await InventoryItemModel.findOne({ id: inventoryItem.id }).exec();

            if (existingItem) {
              if (onDuplicate === 'skip') {
                result.successCount++;
                continue;
              } else if (onDuplicate === 'update') {
                await InventoryItemModel.updateOne(
                  { id: inventoryItem.id },
                  {
                    name: inventoryItem.name,
                    price: inventoryItem.price,
                    availableQuantity: inventoryItem.availableQuantity,
                    updatedAt: new Date()
                  }
                ).exec();
                result.successCount++;
                continue;
              }
            }

            // Create new item
            await InventoryItemModel.create(inventoryItem);
            result.successCount++;

          } catch (error) {
            result.failureCount++;
            result.errors.push({
              row: rowNum,
              message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          }
        }

        if (result.failureCount > 0) {
          result.success = false;
        }

        resolve(result);
      });

      parser.write(csvContent);
      parser.end();
    });
  }
}
