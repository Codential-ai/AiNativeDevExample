/**
 * Inventory API routes
 * Handles inventory search and item retrieval
 */

import { Router, Request, Response } from 'express';
import { InventoryManager } from '../services/InventoryManager';

export function createInventoryRoutes(inventoryManager: InventoryManager): Router {
  const router = Router();

  /**
   * GET /search
   * Search for inventory items by name (fuzzy matching)
   */
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      // Get all available items
      const allItems = await inventoryManager.getAvailableItems();

      // Simple fuzzy search: case-insensitive substring matching
      const searchLower = query.toLowerCase();
      const matchedItems = allItems.filter(item =>
        item.name.toLowerCase().includes(searchLower)
      );

      return res.json({
        success: true,
        items: matchedItems,
        count: matchedItems.length
      });
    } catch (error) {
      console.error('Error searching inventory:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to search inventory'
      });
    }
  });

  /**
   * GET /:itemId
   * Get a specific inventory item by ID
   */
  router.get('/:itemId', async (req: Request, res: Response) => {
    try {
      const { itemId } = req.params;

      const item = await inventoryManager.getItemById(itemId);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }

      return res.json({
        success: true,
        item
      });
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch item'
      });
    }
  });

  return router;
}
