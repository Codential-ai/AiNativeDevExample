// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../specs/orders.spec.md
// (spec:d181ac47) (code:9ef0b7b9)

import { Order } from '../types/orders';
import { CreateOrderRequest } from '../types/orders';
import { OrderModel } from '../models/Order';
import { v4 as uuidv4 } from 'uuid';

export class OrderService {
  /**
   * Creates a new order from checkout data
   */
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const orderId = uuidv4();

    const order = await OrderModel.create({
      orderId,
      userId: request.userId,
      paymentId: request.paymentId,
      items: request.items,
      subtotal: request.subtotal,
      tax: request.tax,
      total: request.total
    });

    return order.toObject() as unknown as Order;
  }

  /**
   * Retrieves an order by its ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    const order = await OrderModel.findOne({ orderId }).exec();
    return order ? (order.toObject() as unknown as Order) : null;
  }

  /**
   * Retrieves an order by payment ID
   */
  async getOrderByPaymentId(paymentId: string): Promise<Order | null> {
    const order = await OrderModel.findOne({ paymentId }).exec();
    return order ? (order.toObject() as unknown as Order) : null;
  }

  /**
   * Retrieves all orders for a specific user, sorted by most recent first
   */
  async getUserOrders(userId: string): Promise<Order[]> {
    const orders = await OrderModel.find({ userId })
      .sort({ createdAt: -1 })
      .exec();
    return orders.map(order => order.toObject() as unknown as Order);
  }
}
