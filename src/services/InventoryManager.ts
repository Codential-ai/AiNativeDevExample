// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../specs/shopping-cart.spec.md
// (spec:968ddcf7) (code:599d6a5d)

/**
 * InventoryManager service for managing inventory items in MongoDB
 */

import { ShoppingCartItem, InventoryItem } from '../types';
import { InventoryItemModel } from '../models/InventoryItem';

export class InventoryManager {
  private reservations: Map<string, number> = new Map();

  async getAvailableItems(): Promise<InventoryItem[]> {
    const items = await InventoryItemModel.find({}).exec();
    return items.map(item => {
      const obj = item.toObject() as unknown as InventoryItem;
      const reserved = this.reservations.get(obj.id) || 0;
      return {
        ...obj,
        availableQuantity: obj.availableQuantity - reserved
      };
    });
  }

  async getItemById(itemId: string): Promise<InventoryItem | null> {
    const item = await InventoryItemModel.findOne({ id: itemId }).exec();
    if (!item) return null;
    const obj = item.toObject() as unknown as InventoryItem;
    const reserved = this.reservations.get(itemId) || 0;
    return {
      ...obj,
      availableQuantity: obj.availableQuantity - reserved
    };
  }

  async updateInventory(itemId: string, quantity: number): Promise<boolean> {
    try {
      if (quantity < 0) return false;
      const result = await InventoryItemModel.updateOne(
        { id: itemId },
        { availableQuantity: quantity }
      ).exec();
      return result.modifiedCount > 0;
    } catch {
      return false;
    }
  }

  async reserveItems(items: ShoppingCartItem[]): Promise<boolean> {
    try {
      for (const cartItem of items) {
        const inventoryItem = await InventoryItemModel.findOne({ id: cartItem.id }).exec();
        if (!inventoryItem) return false;
        const currentReserved = this.reservations.get(cartItem.id) || 0;
        const available = inventoryItem.availableQuantity - currentReserved;
        if (available < cartItem.quantity) return false;
      }
      for (const cartItem of items) {
        const currentReserved = this.reservations.get(cartItem.id) || 0;
        this.reservations.set(cartItem.id, currentReserved + cartItem.quantity);
      }
      return true;
    } catch {
      return false;
    }
  }

  async releaseReservation(items: ShoppingCartItem[]): Promise<void> {
    for (const cartItem of items) {
      const currentReserved = this.reservations.get(cartItem.id) || 0;
      const newReserved = Math.max(0, currentReserved - cartItem.quantity);
      if (newReserved > 0) {
        this.reservations.set(cartItem.id, newReserved);
      } else {
        this.reservations.delete(cartItem.id);
      }
    }
  }

  async fuzzySearchByName(query: string): Promise<InventoryItem[]> {
    const items = await InventoryItemModel.find({
      name: { $regex: query, $options: 'i' }
    }).exec();
    
    return items.map(item => {
      const obj = item.toObject() as unknown as InventoryItem;
      const reserved = this.reservations.get(obj.id) || 0;
      return {
        ...obj,
        availableQuantity: obj.availableQuantity - reserved
      };
    });
  }
}
