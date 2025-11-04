// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../specs/shopping-cart.spec.md
// (spec:ac372cc8) (code:036a9b62)

import mongoose, { Schema, Document, Model } from 'mongoose';

// Define the InventoryItem interface for Mongoose documents
export interface InventoryItemDocument extends Document {
  id: string;
  name: string;
  price: number;
  availableQuantity: number;
  reservedQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema for InventoryItem
const inventoryItemSchema = new Schema<InventoryItemDocument>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  availableQuantity: { type: Number, required: true, min: 0 },
  reservedQuantity: { type: Number, default: 0, min: 0 }
}, {
  timestamps: true
});

// Add index for efficient querying
inventoryItemSchema.index({ id: 1 });

export const InventoryItemModel: Model<InventoryItemDocument> = mongoose.model<InventoryItemDocument>('InventoryItem', inventoryItemSchema);

export default InventoryItemModel;
