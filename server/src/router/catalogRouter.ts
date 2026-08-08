import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { createCatalogItem, createCategory, createSale, deleteCatalogItem, getCatalogItem, getCatalogItems, getCategories, quickAddCatalogItem, updateCatalogItem, uploadCatalogImage } from '../controller/catalogController';

const router = Router(); router.use(authMiddleware);
router.get('/categories', getCategories); router.post('/categories', adminMiddleware, createCategory);
router.get('/items', getCatalogItems); router.post('/items/quick-add', adminMiddleware, quickAddCatalogItem); router.post('/items', adminMiddleware, createCatalogItem); router.get('/items/:id', getCatalogItem); router.patch('/items/:id', adminMiddleware, updateCatalogItem); router.delete('/items/:id', adminMiddleware, deleteCatalogItem);
router.post('/upload', adminMiddleware, uploadCatalogImage); router.post('/sales', createSale);
export default router;
