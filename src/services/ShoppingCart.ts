// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../specs/shopping-cart.spec.md
// (spec:968ddcf7) (code:30337aaf)

/**
 * ShoppingCart service for managing customer shopping carts and checkout
 */

import {
  ShoppingCartItem,
  CartSummary,
  PaymentDetails,
  CheckoutResult,
  OrderItem,
  CreateOrderRequest
} from '../types';
import { InventoryManager } from './InventoryManager';
import { OrderService as IOrderService } from './OrderService';

export class ShoppingCart {
  private items: Map<string, ShoppingCartItem> = new Map();
  private inventoryManager: InventoryManager;
  private orderService: IOrderService;
  private readonly TAX_RATE = 0.08; // 8% tax rate

  constructor(inventoryManager: InventoryManager, orderService: IOrderService) {
    this.inventoryManager = inventoryManager;
    this.orderService = orderService;
  }

  async addItem(itemId: string, quantity: number): Promise<boolean> {
    if (quantity <= 0) return false;

    // Fetch item details from inventory
    const inventoryItem = await this.inventoryManager.getItemById(itemId);
    if (!inventoryItem) return false;

    const existingItem = this.items.get(itemId);
    const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    // Validate availability
    if (inventoryItem.availableQuantity < newQuantity) {
      return false;
    }

    if (existingItem) {
      existingItem.quantity = newQuantity;
      existingItem.name = inventoryItem.name;
      existingItem.price = inventoryItem.price;
    } else {
      this.items.set(itemId, {
        id: itemId,
        name: inventoryItem.name,
        price: inventoryItem.price,
        quantity
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

        // Simulate payment processing
        
        const paymentSuccessful = await this.processPayment(paymentDetails);

        if (paymentSuccessful) {
          // Create order record - transform ShoppingCartItem to OrderItem with inventoryItemId and subtotal
          const orderItems: OrderItem[] = updatedCartItems.map(item => ({
            inventoryItemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity
          }));

          const createOrderRequest: CreateOrderRequest = {
            userId: 'default-user', // In a real app, this would come from session/auth
            paymentId: `payment_${Date.now()}`,
            items: orderItems,
            subtotal: cartSummary.subtotal,
            tax: cartSummary.tax,
            total: cartSummary.total
          };

          const order = await this.orderService.createOrder(createOrderRequest);

          // Update inventory quantities (remove reserved items)
          for (const item of updatedCartItems) {
            const inventoryItem = await this.inventoryManager.getItemById(item.id);
            if (inventoryItem) {
              await this.inventoryManager.updateInventory(
                item.id, 
                inventoryItem.availableQuantity - item.quantity
              );
            }
          }

          // Clear cart
          this.items.clear();

          return { success: true, orderId: order.orderId };
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

  private async processPayment(paymentDetails: PaymentDetails): Promise<boolean> {
    // Simulate payment processing
    // In a real implementation, this would integrate with Stripe or another payment provider
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 95% success rate
        resolve(Math.random() > 0.05);
      }, 100);
    });
  }
}
