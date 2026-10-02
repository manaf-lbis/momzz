import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { adminMiddleware } from '../../shared/middleware/admin.middleware';
import {
  createCatalogItem,
  createCategory,
  createSale,
  getSales,
  getSaleById,
  updateSale,
  cancelSale,
  deleteCatalogItem,
  getCatalogItem,
  getCatalogItems,
  getCategories,
  getItemHistory,
  adjustItemStock,
  quickAddCatalogItem,
  updateCatalogItem,
  uploadCatalogImage,
} from './catalog.controller';

const router = Router();
router.use(authMiddleware);

router.get('/categories', getCategories);
router.post('/categories', adminMiddleware, createCategory);

router.get('/items', getCatalogItems);
router.post('/items/quick-add', adminMiddleware, quickAddCatalogItem);
router.post('/items', adminMiddleware, createCatalogItem);
router.get('/items/:id', getCatalogItem);
router.get('/items/:id/history', getItemHistory);
router.post('/items/:id/stock-adjust', adminMiddleware, adjustItemStock);
router.patch('/items/:id', adminMiddleware, updateCatalogItem);
router.delete('/items/:id', adminMiddleware, deleteCatalogItem);
router.post('/upload', adminMiddleware, uploadCatalogImage);

// Enterprise Sales & Billing Invoicing Endpoints
router.get('/sales', getSales);
router.get('/sales/:id', getSaleById);
router.post('/sales', createSale);
router.patch('/sales/:id', updateSale);
router.post('/sales/:id/cancel', cancelSale);

export default router;
