
export interface OrderItem {
  inventoryItemId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  _id?: string;
  orderId: string;
  userId: string;
  paymentId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateOrderRequest {
  userId: string;
  paymentId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface OrderQueryResult {
  success: boolean;
  order?: Order;
  orders?: Order[];
  error?: string;
}
