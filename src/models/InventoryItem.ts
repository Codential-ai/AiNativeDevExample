/**
 * Mongoose schema and model for InventoryItem
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { InventoryItem } from '../types';

// Mongoose Schema for InventoryItem
const inventoryItemSchema = new Schema<InventoryItem>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  availableQuantity: { type: Number, required: true, min: 0 }
}, {
  timestamps: true
});

export const InventoryItemModel: Model<InventoryItem> = mongoose.model<InventoryItem>('InventoryItem', inventoryItemSchema);

export default InventoryItemModel;
