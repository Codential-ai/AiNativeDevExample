/**
 * Orders API routes
 * Handles order retrieval and history
 */

import { Router, Request, Response } from 'express';
import { OrderService } from '../services/OrderService';

export function createOrderRoutes(orderService: OrderService): Router {
  const router = Router();

  /**
   * GET /:orderId
   * Get order details by order ID
   */
  router.get('/:orderId', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;

      const order = await orderService.getOrderById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      return res.json({
        success: true,
        order
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch order'
      });
    }
  });

  /**
   * GET /user/:userId
   * Get all orders for a user
   */
  router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const orders = await orderService.getUserOrders(userId);

      return res.json({
        success: true,
        orders,
        count: orders.length
      });
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user orders'
      });
    }
  });

  /**
   * GET /payment/:paymentId
   * Get order by payment ID
   */
  router.get('/payment/:paymentId', async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;

      const order = await orderService.getOrderByPaymentId(paymentId);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      return res.json({
        success: true,
        order
      });
    } catch (error) {
      console.error('Error fetching order by payment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch order'
      });
    }
  });

  return router;
}
