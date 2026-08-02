import { Request, Response } from 'express';
import { inventoryRepository } from '../repository/inventoryRepository';
import { sendSuccess, sendError } from '../utils/responseHandler';

/**
 * GET /api/inventory?q=<search_query>
 * Search task inventory for auto-complete suggestions.
 */
export const searchInventory = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 15;

    if (q.length > 0) {
      const results = await inventoryRepository.search(q, limit);
      return sendSuccess(res, 'Inventory search results.', results, 200);
    }

    const all = await inventoryRepository.findAll(limit);
    return sendSuccess(res, 'All inventory items.', all, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to fetch inventory.', 500);
  }
};

/**
 * POST /api/inventory
 * Admin: Add a new item to the task inventory master list.
 */
export const addInventoryItem = async (req: Request, res: Response) => {
  try {
    const { name, category } = req.body;
    if (!name || !name.trim()) {
      return sendError(res, 'Task name is required.', 400);
    }

    const item = await inventoryRepository.upsertByName(name.trim(), category);
    return sendSuccess(res, 'Task added to inventory.', item, 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to add inventory item.', 500);
  }
};

/**
 * DELETE /api/inventory/:id
 * Admin: Remove an item from the task inventory.
 */
export const deleteInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await inventoryRepository.deleteById(id);
    if (!deleted) {
      return sendError(res, 'Inventory item not found.', 404);
    }
    return sendSuccess(res, 'Item removed from inventory.', null, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete inventory item.', 500);
  }
};
