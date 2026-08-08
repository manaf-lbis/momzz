import { Request, Response } from 'express';
import { createHash } from 'crypto';
import { ENV } from '../config/env';
import { catalogRepository } from '../repository/catalogRepository';
import { sendError, sendSuccess } from '../utils/responseHandler';

const format = (document: any) => ({ ...document.toObject(), id: document._id.toString() });

export const getCategories = async (_req: Request, res: Response) => {
  try { return sendSuccess(res, 'Categories retrieved.', (await catalogRepository.getCategories()).map(format)); }
  catch (error: any) { return sendError(res, error.message || 'Could not load categories.', 500); }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, type } = req.body;
    if (!name?.trim() || !['PRODUCT', 'SERVICE', 'BOTH'].includes(type)) return sendError(res, 'A category name and valid type are required.', 400);
    return sendSuccess(res, 'Category created.', format(await catalogRepository.createCategory({ name: name.trim(), description, type })), 201);
  } catch (error: any) { return sendError(res, error.code === 11000 ? 'Category name already exists.' : error.message || 'Could not create category.', 400); }
};

export const getCatalogItems = async (req: Request, res: Response) => {
  try { return sendSuccess(res, 'Catalog items retrieved.', (await catalogRepository.getItems({ q: req.query.q as string, itemType: req.query.itemType as string, category: req.query.category as string })).map(format)); }
  catch (error: any) { return sendError(res, error.message || 'Could not load catalog.', 500); }
};

export const getCatalogItem = async (req: Request, res: Response) => {
  try { const item = await catalogRepository.findItem(req.params.id); return item ? sendSuccess(res, 'Item retrieved.', format(item)) : sendError(res, 'Item not found.', 404); }
  catch (error: any) { return sendError(res, error.message || 'Could not load item.', 500); }
};

const validateItem = (body: any) => {
  const hasCategory = body.category || body.categoryId || body.categoryName || true; // category is auto-assigned to default if omitted
  if (!body.title?.trim() || !hasCategory || !['PRODUCT', 'SERVICE'].includes(body.itemType) || Number.isNaN(Number(body.price))) {
    return 'Title, category, type, and price are required.';
  }
  if (body.itemType === 'PRODUCT' && (body.stockQuantity === undefined || Number(body.stockQuantity) < 0)) {
    return 'Products need a valid stock quantity.';
  }
  return null;
};

export const createCatalogItem = async (req: Request, res: Response) => {
  try {
    let categoryId = req.body.category || req.body.categoryId;
    if (!categoryId) {
      const categories = await catalogRepository.getCategories();
      categoryId = categories[0]?._id;
    }
    
    const payload = { 
      ...req.body, 
      category: categoryId,
      title: req.body.title?.trim(),
      price: Number(req.body.price),
      stockQuantity: req.body.itemType === 'PRODUCT' ? Number(req.body.stockQuantity || 0) : 0,
      images: Array.from(new Set(req.body.images?.length ? req.body.images : (req.body.thumbnailUrl ? [req.body.thumbnailUrl] : [])))
    };
    delete payload.categoryId;

    const error = validateItem(payload); 
    if (error) return sendError(res, error, 400);

    const item = await catalogRepository.createItem(payload);
    const populatedItem = await item.populate('category', 'name type');
    return sendSuccess(res, 'Catalog item created.', format(populatedItem), 201);
  } catch (error: any) { 
    return sendError(res, error.code === 11000 ? 'SKU already exists.' : error.message || 'Could not create item.', 400); 
  }
};

// Used from the job checklist: capture the item name now, complete its stock and price later.
export const quickAddCatalogItem = async (req: Request, res: Response) => {
  try {
    const title = req.body.title?.trim();
    if (!title) return sendError(res, 'An item name is required.', 400);
    const category = (await catalogRepository.getCategories())[0];
    const item = await catalogRepository.createItem({
      title,
      category: category._id,
      itemType: 'PRODUCT',
      price: 0,
      stockQuantity: 0,
      trackStock: false,
      images: [],
      thumbnailUrl: '',
      isAvailable: true,
    });
    return sendSuccess(res, 'Item added to inventory.', format(await item.populate('category', 'name type')), 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Could not add item to inventory.', 400);
  }
};

export const updateCatalogItem = async (req: Request, res: Response) => {
  try {
    if (req.body.itemType === 'PRODUCT' && Number(req.body.stockQuantity) < 0) return sendError(res, 'Stock cannot be negative.', 400);
    const updates = { ...req.body, ...(req.body.price !== undefined ? { price: Number(req.body.price) } : {}), ...(req.body.stockQuantity !== undefined ? { stockQuantity: Number(req.body.stockQuantity), trackStock: true } : {}) };
    const item = await catalogRepository.updateItem(req.params.id, updates);
    return item ? sendSuccess(res, 'Catalog item updated.', format(item)) : sendError(res, 'Item not found.', 404);
  } catch (error: any) { return sendError(res, error.message || 'Could not update item.', 400); }
};

export const deleteCatalogItem = async (req: Request, res: Response) => {
  try { return (await catalogRepository.deleteItem(req.params.id)) ? sendSuccess(res, 'Catalog item removed.', null) : sendError(res, 'Item not found.', 404); }
  catch (error: any) { return sendError(res, error.message || 'Could not remove item.', 500); }
};

export const uploadCatalogImage = async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) return sendError(res, 'Image uploads are not configured.', 503);
    if (!image || typeof image !== 'string' || !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(image)) return sendError(res, 'Use a JPG, PNG, or WebP image.', 400);
    const timestamp = Math.floor(Date.now() / 1000); const folder = 'momzz/catalog';
    const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${ENV.CLOUDINARY_API_SECRET}`).digest('hex');
    const form = new FormData(); form.append('file', image); form.append('api_key', ENV.CLOUDINARY_API_KEY); form.append('timestamp', String(timestamp)); form.append('folder', folder); form.append('signature', signature);
    const cloudinary = await fetch(`https://api.cloudinary.com/v1_1/${ENV.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
    const data = await cloudinary.json() as { secure_url?: string; error?: { message?: string } };
    return cloudinary.ok && data.secure_url ? sendSuccess(res, 'Image uploaded.', { url: data.secure_url }) : sendError(res, data.error?.message || 'Image upload failed.', 400);
  } catch (error: any) { return sendError(res, error.message || 'Image upload failed.', 500); }
};

export const createSale = async (req: Request, res: Response) => {
  const reserved: Array<{ id: string; quantity: number }> = [];
  try {
    const lines = req.body.items;
    if (!Array.isArray(lines) || !lines.length) return sendError(res, 'Add at least one item to the sale.', 400);
    const finalized = [];
    for (const line of lines) {
      const item = await catalogRepository.findItem(line.itemId);
      if (!item || !item.isAvailable) throw new Error('One of the selected items is unavailable.');
      const quantity = item.itemType === 'PRODUCT' ? Math.max(1, Number(line.quantity || 1)) : 1;
      if (item.itemType === 'PRODUCT' && !await catalogRepository.deductStock(item._id.toString(), quantity)) throw new Error(`${item.title} does not have enough stock.`);
      if (item.itemType === 'PRODUCT') reserved.push({ id: item._id.toString(), quantity });
      const discountAmount = Math.max(0, Number(line.discountAmount || 0)); const totalPrice = Math.max(0, item.price * quantity - discountAmount);
      finalized.push({ item: item._id, quantity, unitPrice: item.price, discountAmount, totalPrice });
    }
    const subtotal = finalized.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0); const totalDiscount = finalized.reduce((sum, line) => sum + line.discountAmount, 0);
    const sale = await catalogRepository.createSale({ customerName: req.body.customerName?.trim(), customerMobile: req.body.customerMobile?.trim(), items: finalized, subtotal, totalDiscount, grandTotal: subtotal - totalDiscount, soldBy: req.user!.id as any });
    return sendSuccess(res, 'Sale completed.', format(sale), 201);
  } catch (error: any) {
    await Promise.all(reserved.map(({ id, quantity }) => catalogRepository.restoreStock(id, quantity)));
    return sendError(res, error.message || 'Could not complete sale.', 400);
  }
};
