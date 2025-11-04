/**
 * ShoppingCart service for managing customer shopping carts and checkout
 */

import Stripe from 'stripe';
import {
  ShoppingCartItem,
  CartSummary,
  PaymentDetails,
  CheckoutResult
} from '../types';
import { InventoryManager } from './InventoryManager';

export class ShoppingCart {
  private items: Map<string, ShoppingCartItem> = new Map();
  private inventoryManager: InventoryManager;
  private stripe: Stripe;
  private readonly TAX_RATE = 0.08; // 8% tax rate

  constructor(inventoryManager: InventoryManager) {
    this.inventoryManager = inventoryManager;
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  }

  addItem(itemId: string, quantity: number): boolean {
    if (quantity <= 0) return false;

    // This is a synchronous method in the API, but we need async for MongoDB
    // In a real implementation, this would need to be async or use caching
    // For now, we'll implement basic validation logic
    const existingItem = this.items.get(itemId);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const totalQuantity = currentQuantity + quantity;

    // Note: In a production system, this would need async inventory validation
    // We'll add the item optimistically and validate during checkout
    if (existingItem) {
      existingItem.quantity = totalQuantity;
    } else {
      // We need the item details, which would require async call
      // For now, we'll store minimal info and fetch details during checkout
      this.items.set(itemId, {
        id: itemId,
        name: '', // Will be populated from inventory during checkout
        price: 0, // Will be populated from inventory during checkout
        quantity: quantity
      });
    }

    return true;
  }

  removeItem(itemId: string, quantity?: number): boolean {
    const existingItem = this.items.get(itemId);
    if (!existingItem) return false;

    if (quantity === undefined || quantity >= existingItem.quantity) {
      this.items.delete(itemId);
    } else {
      existingItem.quantity -= quantity;
    }

    return true;
  }

  getCartSummary(): CartSummary {
    const items = Array.from(this.items.values());
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + tax;

    return {
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  async checkout(paymentDetails: PaymentDetails): Promise<CheckoutResult> {
    try {
      const cartItems = Array.from(this.items.values());

      if (cartItems.length === 0) {
        return { success: false, error: 'Cart is empty' };
      }

      // Update cart items with current inventory data
      const updatedCartItems: ShoppingCartItem[] = [];
      for (const cartItem of cartItems) {
        const inventoryItem = await this.inventoryManager.getItemById(cartItem.id);
        if (!inventoryItem) {
          return { success: false, error: `Item ${cartItem.id} is no longer available` };
        }

        updatedCartItems.push({
          ...cartItem,
          name: inventoryItem.name,
          price: inventoryItem.price
        });

        if (inventoryItem.availableQuantity < cartItem.quantity) {
          return { success: false, error: `Insufficient inventory for ${inventoryItem.name}` };
        }
      }

      // Update internal cart items with current data
      for (const updatedItem of updatedCartItems) {
        this.items.set(updatedItem.id, updatedItem);
      }

      // Reserve items during checkout
      if (!await this.inventoryManager.reserveItems(updatedCartItems)) {
        return { success: false, error: 'Unable to reserve items for checkout' };
      }

      try {
        const cartSummary = this.getCartSummary();

        // Validate payment amount
        if (Math.abs(paymentDetails.amount - cartSummary.total) > 0.01) {
          await this.inventoryManager.releaseReservation(updatedCartItems);
          return { success: false, error: 'Payment amount does not match cart total' };
        }

        // Process payment with Stripe
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: Math.round(paymentDetails.amount * 100), // Convert to cents
          currency: paymentDetails.currency.toLowerCase(),
          payment_method: paymentDetails.paymentMethod,
          confirm: true,
          return_url: 'https://example.com/return'
        });

        if (paymentIntent.status === 'succeeded') {
          // Payment successful - commit the reservation and clear cart
          await this.inventoryManager.commitReservation(updatedCartItems);
          this.items.clear();

          const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          return { success: true, orderId };
        } else {
          // Payment failed - release reservation
          await this.inventoryManager.releaseReservation(updatedCartItems);
          return { success: false, error: 'Payment processing failed' };
        }

      } catch (paymentError) {
        // Payment processing error - release reservation
        await this.inventoryManager.releaseReservation(updatedCartItems);
        return { success: false, error: 'Payment processing error' };
      }

    } catch (error) {
      return { success: false, error: 'Checkout process failed' };
    }
  }
}
