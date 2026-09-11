import { Router } from 'express';
import { searchInventory, addInventoryItem, deleteInventoryItem } from './inventory.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { adminMiddleware } from '../../shared/middleware/admin.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Any authenticated user can search inventory for auto-complete
router.get('/', searchInventory);

// Only admins can add/delete inventory items
router.post('/', adminMiddleware, addInventoryItem);
router.delete('/:id', adminMiddleware, deleteInventoryItem);

export default router;
