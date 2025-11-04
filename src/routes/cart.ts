/**
 * Shopping Cart API routes
 * Handles cart operations: create, add/remove items, checkout
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ShoppingCart } from '../services/ShoppingCart';
import { InventoryManager } from '../services/InventoryManager';
import { OrderService } from '../services/OrderService';

// In-memory cart storage (cleared on server restart)
const carts = new Map<string, ShoppingCart>();

export function createCartRoutes(
  inventoryManager: InventoryManager,
  orderService: OrderService
): Router {
  const router = Router();

  /**
   * POST /
   * Create a new shopping cart
   */
  router.post('/', (req: Request, res: Response) => {
    try {
      const cartId = uuidv4();
      const cart = new ShoppingCart(inventoryManager, orderService);
      carts.set(cartId, cart);

      return res.json({
        success: true,
        cartId,
        message: 'Cart created successfully'
      });
    } catch (error) {
      console.error('Error creating cart:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create cart'
      });
    }
  });

  /**
   * GET /:cartId
   * Get cart summary with items and totals
   */
  router.get('/:cartId', (req: Request, res: Response) => {
    try {
      const { cartId } = req.params;
      const cart = carts.get(cartId);

      if (!cart) {
        return res.status(404).json({
          success: false,
          error: 'Cart not found'
        });
      }

      const summary = cart.getCartSummary();

      return res.json({
        success: true,
        cart: summary
      });
    } catch (error) {
      console.error('Error fetching cart:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch cart'
      });
    }
  });

  /**
   * POST /:cartId/items
   * Add item to cart
   */
  router.post('/:cartId/items', async (req: Request, res: Response) => {
    try {
      const { cartId } = req.params;
      const { itemId, quantity } = req.body;

      if (!itemId || !quantity) {
        return res.status(400).json({
          success: false,
          error: 'Item ID and quantity are required'
        });
      }

      if (typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantity must be a positive number'
        });
      }

      const cart = carts.get(cartId);
      if (!cart) {
        return res.status(404).json({
          success: false,
          error: 'Cart not found'
        });
      }

      // Verify item exists in inventory
      const inventoryItem = await inventoryManager.getItemById(itemId);
      if (!inventoryItem) {
        return res.status(400).json({
          success: false,
          error: 'Item not found in inventory'
        });
      }

      if (inventoryItem.availableQuantity < quantity) {
        return res.status(409).json({
          success: false,
          error: 'Insufficient inventory for item'
        });
      }

      const success = await cart.addItem(itemId, quantity);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Failed to add item to cart'
        });
      }

      const summary = cart.getCartSummary();

      return res.json({
        success: true,
        message: 'Item added to cart',
        cart: summary
      });
    } catch (error) {
      console.error('Error adding item to cart:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to add item to cart'
      });
    }
  });

  /**
   * DELETE /:cartId/items/:itemId
   * Remove item from cart
   */
  router.delete('/:cartId/items/:itemId', (req: Request, res: Response) => {
    try {
      const { cartId, itemId } = req.params;
      const { quantity } = req.query;

      const cart = carts.get(cartId);
      if (!cart) {
        return res.status(404).json({
          success: false,
          error: 'Cart not found'
        });
      }

      const removeQuantity = quantity ? parseInt(quantity as string) : undefined;

      const success = cart.removeItem(itemId, removeQuantity);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Item not found in cart'
        });
      }

      const summary = cart.getCartSummary();

      return res.json({
        success: true,
        message: 'Item removed from cart',
        cart: summary
      });
    } catch (error) {
      console.error('Error removing item from cart:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to remove item from cart'
      });
    }
  });

  /**
   * POST /:cartId/checkout
   * Process checkout and create order
   */
  router.post('/:cartId/checkout', async (req: Request, res: Response) => {
    try {
      const { cartId } = req.params;
      const { paymentMethod, amount, currency } = req.body;

      if (!paymentMethod || !amount || !currency) {
        return res.status(400).json({
          success: false,
          error: 'Payment method, amount, and currency are required'
        });
      }

      const cart = carts.get(cartId);
      if (!cart) {
        return res.status(404).json({
          success: false,
          error: 'Cart not found'
        });
      }

      const result = await cart.checkout({
        paymentMethod,
        amount,
        currency
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      // Clear cart after successful checkout
      carts.delete(cartId);

      return res.json({
        success: true,
        orderId: result.orderId,
        message: 'Checkout successful',
        order: {
          orderId: result.orderId,
          total: amount,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error during checkout:', error);
      return res.status(500).json({
        success: false,
        error: 'Checkout failed'
      });
    }
  });

  return router;
}
