/**
 * Type definitions for shopping cart and inventory system
 */

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
