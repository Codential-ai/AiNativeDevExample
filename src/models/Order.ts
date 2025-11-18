import mongoose, { Schema, Document, Types } from 'mongoose';

interface OrderItem {
  inventoryItemId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  _id?: Types.ObjectId;
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

type OrderDocument = Order & Document;

const OrderItemSchema = new Schema<OrderItem>({
  inventoryItemId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true, min: 0 }
});

const OrderSchema = new Schema<OrderDocument>({
  orderId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  userId: { type: String, required: true },
  paymentId: { type: String, required: true, unique: true },
  items: { type: [OrderItemSchema], required: true, validate: [(val: OrderItem[]) => val.length > 0, 'Order must have at least one item'] },
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 }
}, {
  timestamps: true
});

// Add indexes for common queries
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ paymentId: 1 });
OrderSchema.index({ orderId: 1 });

export const OrderModel = mongoose.model<OrderDocument>('Order', OrderSchema);
export { Order, OrderItem, OrderDocument };
