// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../specs/shopping-cart.spec.md
// (spec:ac372cc8) (code:54f1e862)

/**
 * Type definitions for shopping cart and inventory system
 */

// Re-export order types
export type { Order, OrderItem, CreateOrderRequest } from './orders';

export interface ShoppingCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface InventoryItem {
  _id?: string;
  id: string;
  name: string;
  price: number;
  availableQuantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CartSummary {
  items: ShoppingCartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface PaymentDetails {
  paymentMethod: string;
  amount: number;
  currency: string;
}

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export interface BulkUploadResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: { row: number; message: string }[];
}

export interface BulkUploadOptions {
  onDuplicate?: 'skip' | 'update';
  delimiter?: string;
}
