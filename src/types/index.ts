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
  reservedQuantity?: number;
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

// Order related types for integration with OrderService
export interface OrderItem {
  inventoryItemId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  orderId: string;
  userId: string;
  paymentId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateOrderRequest {
  userId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentId: string;
}
