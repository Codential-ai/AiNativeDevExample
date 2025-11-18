
/**
 * InventoryManager service for managing inventory items in MongoDB
 */

import { ShoppingCartItem, InventoryItem } from '../types';
import { InventoryItemModel } from '../models/InventoryItem';

export class InventoryManager {

  /**
   * Highly simplified method to find available items, in a real system, there would be a lot more business logic to determine availability
   * @returns 
   */
  async getAvailableItems(): Promise<InventoryItem[]> {
    const items = await InventoryItemModel.find({}).exec();
    return items.map(item => {
      const obj = item.toObject() as unknown as InventoryItem;
      const reserved = obj.reservedQuantity || 0;
      return {
        ...obj,
        availableQuantity: obj.availableQuantity - reserved
      };
    });
  }

  async getItemById(itemId: string): Promise<InventoryItem | null> {
    // inefficient because it returns a full Mongoose document and then later converts it to a plain object. 
    const item = await InventoryItemModel.findOne({ id: itemId }).exec();  
    if (!item) return null;
    const obj = item.toObject() as unknown as InventoryItem;
    const reserved = obj.reservedQuantity || 0;
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
      //❌ NOT IN A TRANSACTION - VULNERABLE TO RACE CONDITIONS
      for (const cartItem of items) {
        const inventoryItem = await InventoryItemModel.findOne({ id: cartItem.id }).exec();
        if (!inventoryItem) return false;
        const currentReserved = inventoryItem.reservedQuantity || 0;
        const available = inventoryItem.availableQuantity - currentReserved;
        if (available < cartItem.quantity) return false;
        await InventoryItemModel.updateOne(
          { id: cartItem.id },
          { reservedQuantity: currentReserved + cartItem.quantity }
        ).exec();
      }
      return true;
    } catch {
      //❌ No releasing of reservations on an error means we will have orphaned reservations if the operation fails
      return false;
    }
  }

  async releaseReservation(items: ShoppingCartItem[]): Promise<void> {
    for (const cartItem of items) {
      const inventoryItem = await InventoryItemModel.findOne({ id: cartItem.id }).exec();
      if (!inventoryItem) continue;
      const currentReserved = inventoryItem.reservedQuantity || 0;
      const newReserved = Math.max(0, currentReserved - cartItem.quantity);
      await InventoryItemModel.updateOne(
        { id: cartItem.id },
        { reservedQuantity: newReserved }
      ).exec();
    }
  }

  async fuzzySearchByName(query: string): Promise<InventoryItem[]> {
    const items = await InventoryItemModel.find({
      name: { $regex: query, $options: 'i' }
    }).exec();

    return items.map(item => {
      const obj = item.toObject() as unknown as InventoryItem;
      const reserved = obj.reservedQuantity || 0;
      return {
        ...obj,
        availableQuantity: obj.availableQuantity - reserved
      };
    });
  }

  async getItemsBelowPrice(maxPrice: number): Promise<InventoryItem[]> {
    const items = await InventoryItemModel.find({ price: { $lt: maxPrice } }).lean().exec();
    return items.map(item => {
      const reserved = item.reservedQuantity || 0;
      return {
        ...(item as unknown as InventoryItem),
        availableQuantity: item.availableQuantity - reserved
      };
    });
  }
}
