/**
 * InventoryManager service for managing inventory items in MongoDB
 */

import { ShoppingCartItem, InventoryItem } from '../types';
import { InventoryItemModel } from '../models/InventoryItem';

export class InventoryManager {
  private reservations: Map<string, number> = new Map();

  async getAvailableItems(): Promise<InventoryItem[]> {
    const items = await InventoryItemModel.find({}).exec();
    return items.map(item => ({
      ...item.toObject(),
      availableQuantity: item.availableQuantity - (this.reservations.get(item.id) || 0)
    }));
  }

  async getItemById(itemId: string): Promise<InventoryItem | null> {
    const item = await InventoryItemModel.findOne({ id: itemId }).exec();
    if (!item) return null;

    return {
      ...item.toObject(),
      availableQuantity: item.availableQuantity - (this.reservations.get(itemId) || 0)
    };
  }

  async updateInventory(itemId: string, quantity: number): Promise<boolean> {
    try {
      const result = await InventoryItemModel.updateOne(
        { id: itemId },
        { availableQuantity: quantity }
      ).exec();
      return result.modifiedCount > 0;
    } catch (error) {
      return false;
    }
  }

  async reserveItems(items: ShoppingCartItem[]): Promise<boolean> {
    try {
      // Check if all items can be reserved
      for (const cartItem of items) {
        const inventoryItem = await InventoryItemModel.findOne({ id: cartItem.id }).exec();
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
    } catch (error) {
      return false;
    }
  }

  async releaseReservation(items: ShoppingCartItem[]): Promise<void> {
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

  async commitReservation(items: ShoppingCartItem[]): Promise<void> {
    for (const cartItem of items) {
      await InventoryItemModel.updateOne(
        { id: cartItem.id },
        { $inc: { availableQuantity: -cartItem.quantity } }
      ).exec();

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
