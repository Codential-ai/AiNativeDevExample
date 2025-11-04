// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../specs/orders.spec.md
// (spec:d181ac47) (code:eaca31a7)

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
