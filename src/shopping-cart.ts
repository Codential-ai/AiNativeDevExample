// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../specs/shopping-cart.spec.md
// (spec:f5905195) (code:12135182)

import Stripe from 'stripe';

interface ShoppingCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  availableQuantity: number;
}

interface CartSummary {
  items: ShoppingCartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

interface PaymentDetails {
  paymentMethod: string;
  amount: number;
  currency: string;
}

interface CheckoutResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

class InventoryManager {
  private inventory: Map<string, InventoryItem> = new Map();
  private reservations: Map<string, number> = new Map();

  constructor() {
    // Initialize with some sample inventory
    this.inventory.set('item1', { id: 'item1', name: 'Widget A', price: 10.99, availableQuantity: 100 });
    this.inventory.set('item2', { id: 'item2', name: 'Widget B', price: 15.99, availableQuantity: 50 });
    this.inventory.set('item3', { id: 'item3', name: 'Widget C', price: 7.99, availableQuantity: 75 });
  }

  getAvailableItems(): InventoryItem[] {
    return Array.from(this.inventory.values()).map(item => ({
      ...item,
      availableQuantity: item.availableQuantity - (this.reservations.get(item.id) || 0)
    }));
  }

  getItemById(itemId: string): InventoryItem | null {
    const item = this.inventory.get(itemId);
    if (!item) return null;
    
    return {
      ...item,
      availableQuantity: item.availableQuantity - (this.reservations.get(itemId) || 0)
    };
  }

  updateInventory(itemId: string, quantity: number): boolean {
    const item = this.inventory.get(itemId);
    if (!item) return false;
    
    item.availableQuantity = quantity;
    return true;
  }

  reserveItems(items: ShoppingCartItem[]): boolean {
    // Check if all items can be reserved
    for (const cartItem of items) {
      const inventoryItem = this.inventory.get(cartItem.id);
      if (!inventoryItem) return false;
      
      const currentReservation = this.reservations.get(cartItem.id) || 0;
      const availableQuantity = inventoryItem.availableQuantity - currentReservation;
      
      if (availableQuantity < cartItem.quantity) return false;
    }
    
    // Reserve all items
    for (const cartItem of items) {
      const currentReservation = this.reservations.get(cartItem.id) || 0;
      this.reservations.set(cartItem.id, currentReservation + cartItem.quantity);
    }
    
    return true;
  }

  releaseReservation(items: ShoppingCartItem[]): void {
    for (const cartItem of items) {
      const currentReservation = this.reservations.get(cartItem.id) || 0;
      const newReservation = Math.max(0, currentReservation - cartItem.quantity);
      
      if (newReservation === 0) {
        this.reservations.delete(cartItem.id);
      } else {
        this.reservations.set(cartItem.id, newReservation);
      }
    }
  }

  commitReservation(items: ShoppingCartItem[]): void {
    for (const cartItem of items) {
      const inventoryItem = this.inventory.get(cartItem.id);
      if (inventoryItem) {
        inventoryItem.availableQuantity -= cartItem.quantity;
      }
      
      const currentReservation = this.reservations.get(cartItem.id) || 0;
      const newReservation = Math.max(0, currentReservation - cartItem.quantity);
      
      if (newReservation === 0) {
        this.reservations.delete(cartItem.id);
      } else {
        this.reservations.set(cartItem.id, newReservation);
      }
    }
  }
}

class ShoppingCart {
  private items: Map<string, ShoppingCartItem> = new Map();
  private inventoryManager: InventoryManager;
  private stripe: Stripe;
  private readonly TAX_RATE = 0.08; // 8% tax rate

  constructor(inventoryManager: InventoryManager) {
    this.inventoryManager = inventoryManager;
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16'
    });
  }

  addItem(itemId: string, quantity: number): boolean {
    if (quantity <= 0) return false;
    
    const inventoryItem = this.inventoryManager.getItemById(itemId);
    if (!inventoryItem) return false;
    
    const existingItem = this.items.get(itemId);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const totalQuantity = currentQuantity + quantity;
    
    if (inventoryItem.availableQuantity < totalQuantity) return false;
    
    if (existingItem) {
      existingItem.quantity = totalQuantity;
    } else {
      this.items.set(itemId, {
        id: inventoryItem.id,
        name: inventoryItem.name,
        price: inventoryItem.price,
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
      
      // Validate cart contents against current inventory
      for (const cartItem of cartItems) {
        const inventoryItem = this.inventoryManager.getItemById(cartItem.id);
        if (!inventoryItem) {
          return { success: false, error: `Item ${cartItem.name} is no longer available` };
        }
        if (inventoryItem.availableQuantity < cartItem.quantity) {
          return { success: false, error: `Insufficient inventory for ${cartItem.name}` };
        }
      }
      
      // Reserve items during checkout
      if (!this.inventoryManager.reserveItems(cartItems)) {
        return { success: false, error: 'Unable to reserve items for checkout' };
      }
      
      try {
        const cartSummary = this.getCartSummary();
        
        // Validate payment amount
        if (Math.abs(paymentDetails.amount - cartSummary.total) > 0.01) {
          this.inventoryManager.releaseReservation(cartItems);
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
          (this.inventoryManager as any).commitReservation(cartItems);
          this.items.clear();
          
          const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          return { success: true, orderId };
        } else {
          // Payment failed - release reservation
          this.inventoryManager.releaseReservation(cartItems);
          return { success: false, error: 'Payment processing failed' };
        }
        
      } catch (paymentError) {
        // Payment processing error - release reservation
        this.inventoryManager.releaseReservation(cartItems);
        return { success: false, error: 'Payment processing error' };
      }
      
    } catch (error) {
      return { success: false, error: 'Checkout process failed' };
    }
  }
}

export { ShoppingCart, InventoryManager, ShoppingCartItem, InventoryItem, CartSummary, PaymentDetails, CheckoutResult };
