import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Sale from '../../models/Sale.model';
import Task from '../../models/Task.model';
import { catalogRepository } from './catalog.repository';
import { sendError, sendSuccess } from '../../shared/utils/response.handler';
import { getCloudinaryUrl, extractPublicId, uploadToCloudinary, deleteFromCloudinary, deleteMultipleFromCloudinary } from '../../shared/utils/cloudinary.helper';

const format = (document: any) => {
  const obj = document.toObject ? document.toObject() : { ...document };
  return {
    ...obj,
    id: (document._id || obj._id)?.toString(),
    thumbnailUrl: getCloudinaryUrl(obj.thumbnailUrl),
    images: (obj.images || []).map((img: string) => getCloudinaryUrl(img)),
  };
};

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

    const base64Map = new Map<string, string>();
    const uploadCached = async (base64Str: string): Promise<string> => {
      if (base64Map.has(base64Str)) return base64Map.get(base64Str)!;
      const { publicId } = await uploadToCloudinary(base64Str, 'momzz/catalog');
      base64Map.set(base64Str, publicId);
      return publicId;
    };

    const processedImages: string[] = [];
    const incomingImages = req.body.images?.length ? req.body.images : (req.body.thumbnailUrl ? [req.body.thumbnailUrl] : []);
    for (const img of incomingImages) {
      if (typeof img === 'string' && img.startsWith('data:image')) {
        const publicId = await uploadCached(img);
        processedImages.push(publicId);
      } else if (img) {
        processedImages.push(extractPublicId(img));
      }
    }
    const finalImages = Array.from(new Set(processedImages.filter(Boolean)));
    
    let thumbnailUrl = '';
    if (req.body.thumbnailUrl) {
      if (typeof req.body.thumbnailUrl === 'string' && req.body.thumbnailUrl.startsWith('data:image')) {
        thumbnailUrl = await uploadCached(req.body.thumbnailUrl);
      } else {
        thumbnailUrl = extractPublicId(req.body.thumbnailUrl);
      }
    } else if (finalImages.length > 0) {
      thumbnailUrl = finalImages[0];
    }
    
    const payload = { 
      ...req.body, 
      category: categoryId,
      title: req.body.title?.trim(),
      price: Number(req.body.price),
      stockQuantity: req.body.itemType === 'PRODUCT' ? Number(req.body.stockQuantity || 0) : 0,
      images: finalImages,
      thumbnailUrl,
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

    // Check if an identical or near-duplicate item already exists to prevent duplicates
    const existingDuplicate = await catalogRepository.findNearDuplicate(title);
    if (existingDuplicate) {
      return sendSuccess(
        res,
        'Found existing catalog item.',
        format(await existingDuplicate.populate('category', 'name type')),
        200
      );
    }

    const itemType = req.body.itemType === 'SERVICE' ? 'SERVICE' : 'PRODUCT';
    const categories = await catalogRepository.getCategories();
    const category = categories.find((c) => c.type === itemType || c.type === 'BOTH') || categories[0];

    const price = req.body.price !== undefined ? Number(req.body.price) : 0;
    const stockQuantity = req.body.stockQuantity !== undefined ? Number(req.body.stockQuantity) : 0;

    const item = await catalogRepository.createItem({
      title,
      category: category._id,
      itemType,
      price,
      stockQuantity,
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
    const updates: any = { ...req.body, ...(req.body.price !== undefined ? { price: Number(req.body.price) } : {}), ...(req.body.stockQuantity !== undefined ? { stockQuantity: Number(req.body.stockQuantity), trackStock: true } : {}) };

    const base64Map = new Map<string, string>();
    const uploadCached = async (base64Str: string): Promise<string> => {
      if (base64Map.has(base64Str)) return base64Map.get(base64Str)!;
      const { publicId } = await uploadToCloudinary(base64Str, 'momzz/catalog');
      base64Map.set(base64Str, publicId);
      return publicId;
    };

    if (Array.isArray(updates.images)) {
      const processedImages: string[] = [];
      for (const img of updates.images) {
        if (typeof img === 'string' && img.startsWith('data:image')) {
          const publicId = await uploadCached(img);
          processedImages.push(publicId);
        } else if (img) {
          processedImages.push(extractPublicId(img));
        }
      }
      updates.images = Array.from(new Set(processedImages.filter(Boolean)));
      if (updates.images.length > 0 && !updates.thumbnailUrl) {
        updates.thumbnailUrl = updates.images[0];
      }
    }

    if (updates.thumbnailUrl) {
      if (typeof updates.thumbnailUrl === 'string' && updates.thumbnailUrl.startsWith('data:image')) {
        updates.thumbnailUrl = await uploadCached(updates.thumbnailUrl);
      } else {
        updates.thumbnailUrl = extractPublicId(updates.thumbnailUrl);
      }
    }
    
    const existingItem = await catalogRepository.findItem(req.params.id);
    const item = await catalogRepository.updateItem(req.params.id, updates);
    if (!item) return sendError(res, 'Item not found.', 404);

    // Delete removed images from Cloudinary for storage efficiency
    if (existingItem) {
      const oldImages = [existingItem.thumbnailUrl, ...(existingItem.images || [])].filter(Boolean);
      const newImages = new Set([updates.thumbnailUrl, ...(updates.images || item.images || [])].filter(Boolean));
      const orphaned = oldImages.filter((img) => !newImages.has(img));
      if (orphaned.length > 0) {
        deleteMultipleFromCloudinary(orphaned).catch(() => {});
      }
    }

    return sendSuccess(res, 'Catalog item updated.', format(item));
  } catch (error: any) { return sendError(res, error.message || 'Could not update item.', 400); }
};

export const deleteCatalogItem = async (req: Request, res: Response) => {
  try {
    const existingItem = await catalogRepository.findItem(req.params.id);
    const deleted = await catalogRepository.deleteItem(req.params.id);
    if (!deleted) return sendError(res, 'Item not found.', 404);

    // Delete associated images from Cloudinary for storage efficiency
    if (existingItem) {
      const imagesToDelete = [existingItem.thumbnailUrl, ...(existingItem.images || [])].filter(Boolean);
      if (imagesToDelete.length > 0) {
        deleteMultipleFromCloudinary(imagesToDelete).catch(() => {});
      }
    }

    return sendSuccess(res, 'Catalog item removed.', null);
  }
  catch (error: any) { return sendError(res, error.message || 'Could not remove item.', 500); }
};

export const uploadCatalogImage = async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    const { publicId, url } = await uploadToCloudinary(image, 'momzz/catalog');
    return sendSuccess(res, 'Image uploaded.', { url, publicId });
  } catch (error: any) { return sendError(res, error.message || 'Image upload failed.', 500); }
};

const generateInvoiceNumber = () => {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${randomSuffix}`;
};

const formatSale = (document: any) => {
  if (!document) return null;
  const obj = document.toObject ? document.toObject() : { ...document };
  const id = (document._id || obj._id)?.toString();
  return {
    ...obj,
    id,
    invoiceNumber: obj.invoiceNumber || `INV-${id?.slice(-6).toUpperCase()}`,
    items: (obj.items || []).map((line: any) => {
      const itemDoc = line.item;
      if (itemDoc && typeof itemDoc === 'object') {
        const itemId = (itemDoc._id || itemDoc.id)?.toString();
        return {
          ...line,
          item: {
            ...itemDoc,
            id: itemId,
            thumbnailUrl: getCloudinaryUrl(itemDoc.thumbnailUrl),
            images: (itemDoc.images || []).map((img: string) => getCloudinaryUrl(img)),
          },
        };
      }
      return line;
    }),
  };
};

export const createSale = async (req: Request, res: Response) => {
  const reserved: Array<{ id: string; quantity: number }> = [];
  try {
    const lines = req.body.items;
    if (!Array.isArray(lines) || !lines.length) {
      return sendError(res, 'Add at least one item to the sale.', 400);
    }

    const finalized = [];
    for (const line of lines) {
      const item = await catalogRepository.findItem(line.itemId);
      if (!item || !item.isAvailable) {
        throw new Error('One of the selected items is unavailable.');
      }
      const quantity = Math.max(1, Number(line.quantity || 1));
      if (item.itemType === 'PRODUCT' && item.trackStock !== false) {
        const deducted = await catalogRepository.deductStock(item._id.toString(), quantity);
        if (!deducted) {
          throw new Error(`Insufficient stock for "${item.title}". Only ${item.stockQuantity} available.`);
        }
        reserved.push({ id: item._id.toString(), quantity });
      }

      const unitPrice = Number(line.unitPrice !== undefined ? line.unitPrice : item.price || 0);
      const lineBase = unitPrice * quantity;
      const discountType: 'FLAT' | 'PERCENT' = line.discountType === 'PERCENT' ? 'PERCENT' : 'FLAT';
      const discountVal = Math.max(0, Number(line.discountValue !== undefined ? line.discountValue : (line.discountAmount || 0)));
      const discountAmount = discountType === 'PERCENT'
        ? Math.min(lineBase, (lineBase * discountVal) / 100)
        : Math.min(lineBase, discountVal);
      const totalPrice = Math.max(0, lineBase - discountAmount);

      finalized.push({
        item: item._id,
        quantity,
        unitPrice,
        discountType,
        discountValue: discountVal,
        discountAmount,
        totalPrice,
      });
    }

    const subtotal = finalized.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const itemDiscountTotal = finalized.reduce((sum, line) => sum + line.discountAmount, 0);
    const taxableAfterItemDisc = Math.max(0, subtotal - itemDiscountTotal);

    const billDiscountType: 'FLAT' | 'PERCENT' = req.body.billDiscountType === 'PERCENT' ? 'PERCENT' : 'FLAT';
    const billDiscountVal = Math.max(0, Number(req.body.billDiscountValue !== undefined ? req.body.billDiscountValue : (req.body.totalDiscount || 0)));
    const billDiscountAmount = billDiscountType === 'PERCENT'
      ? Math.min(taxableAfterItemDisc, (taxableAfterItemDisc * billDiscountVal) / 100)
      : Math.min(taxableAfterItemDisc, billDiscountVal);

    const totalDiscount = itemDiscountTotal + billDiscountAmount;
    const grandTotal = Math.max(0, Math.round(subtotal - totalDiscount));

    const invoiceNumber = req.body.invoiceNumber?.trim() || generateInvoiceNumber();

    const sale = await catalogRepository.createSale({
      invoiceNumber,
      customerName: req.body.customerName?.trim(),
      customerMobile: req.body.customerMobile?.trim(),
      paymentMethod: req.body.paymentMethod || 'CASH',
      notes: req.body.notes?.trim(),
      status: 'COMPLETED',
      items: finalized,
      subtotal,
      itemDiscountTotal,
      billDiscountType,
      billDiscountValue: billDiscountVal,
      billDiscountAmount,
      totalDiscount,
      grandTotal,
      soldBy: req.user!.id as any,
    });

    const populated = await catalogRepository.findSale(sale._id.toString());
    return sendSuccess(res, 'Sale completed successfully.', formatSale(populated || sale), 201);
  } catch (error: any) {
    await Promise.all(reserved.map(({ id, quantity }) => catalogRepository.restoreStock(id, quantity)));
    return sendError(res, error.message || 'Could not complete sale.', 400);
  }
};

export const getSales = async (req: Request, res: Response) => {
  try {
    const { q, status, limit } = req.query;
    const rawSales = await catalogRepository.getSales({
      q: q as string,
      status: status as string,
      limit: limit ? Number(limit) : 100,
    });

    const formattedSales = rawSales.map(formatSale);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const completedSales = formattedSales.filter((s: any) => s.status !== 'CANCELLED');
    const todaySales = completedSales.filter((s: any) => new Date(s.createdAt) >= startOfToday);

    const totalRevenue = completedSales.reduce((acc: number, s: any) => acc + (s.grandTotal || 0), 0);
    const todayRevenue = todaySales.reduce((acc: number, s: any) => acc + (s.grandTotal || 0), 0);
    const totalDiscounts = completedSales.reduce((acc: number, s: any) => acc + (s.totalDiscount || 0), 0);
    const avgBillValue = completedSales.length > 0 ? Math.round(totalRevenue / completedSales.length) : 0;

    return sendSuccess(res, 'Sales retrieved.', {
      sales: formattedSales,
      metrics: {
        totalSalesCount: completedSales.length,
        totalRevenue,
        todaySalesCount: todaySales.length,
        todayRevenue,
        totalDiscounts,
        avgBillValue,
      },
    });
  } catch (error: any) {
    return sendError(res, error.message || 'Could not load sales.', 500);
  }
};

export const getSaleById = async (req: Request, res: Response) => {
  try {
    const sale = await catalogRepository.findSale(req.params.id);
    if (!sale) return sendError(res, 'Bill not found.', 404);
    return sendSuccess(res, 'Bill details retrieved.', formatSale(sale));
  } catch (error: any) {
    return sendError(res, error.message || 'Could not load bill details.', 500);
  }
};

export const updateSale = async (req: Request, res: Response) => {
  try {
    const existingSale = await catalogRepository.findSale(req.params.id);
    if (!existingSale) return sendError(res, 'Bill not found.', 404);
    if (existingSale.status === 'CANCELLED') {
      return sendError(res, 'Cannot modify a cancelled/voided bill.', 400);
    }

    const lines = req.body.items;
    if (!Array.isArray(lines) || !lines.length) {
      return sendError(res, 'Bill must contain at least one item.', 400);
    }

    // 1. Calculate stock deltas for reconciliation
    const oldQtyMap = new Map<string, number>();
    for (const oldLine of existingSale.items) {
      const rawItem = oldLine.item as any;
      const itemId = rawItem?._id?.toString() || rawItem?.id?.toString() || rawItem?.toString();
      if (itemId) {
        oldQtyMap.set(itemId, (oldQtyMap.get(itemId) || 0) + oldLine.quantity);
      }
    }

    const newQtyMap = new Map<string, number>();
    for (const newLine of lines) {
      const itemId = newLine.itemId?.toString();
      if (itemId) {
        newQtyMap.set(itemId, (newQtyMap.get(itemId) || 0) + Math.max(1, Number(newLine.quantity || 1)));
      }
    }

    const allItemIds = Array.from(new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]));
    const adjustmentsMade: Array<{ id: string; delta: number }> = [];

    for (const itemId of allItemIds) {
      const oldQ = oldQtyMap.get(itemId) || 0;
      const newQ = newQtyMap.get(itemId) || 0;
      const netDelta = newQ - oldQ;

      if (netDelta > 0) {
        const itemDoc = await catalogRepository.findItem(itemId);
        if (itemDoc && itemDoc.itemType === 'PRODUCT' && itemDoc.trackStock !== false) {
          const deducted = await catalogRepository.deductStock(itemId, netDelta);
          if (!deducted) {
            for (const adj of adjustmentsMade) {
              if (adj.delta > 0) {
                await catalogRepository.restoreStock(adj.id, adj.delta);
              } else if (adj.delta < 0) {
                await catalogRepository.deductStock(adj.id, Math.abs(adj.delta));
              }
            }
            return sendError(res, `Insufficient stock for "${itemDoc.title}". Need +${netDelta} more units.`, 400);
          }
          adjustmentsMade.push({ id: itemId, delta: netDelta });
        }
      } else if (netDelta < 0) {
        const itemDoc = await catalogRepository.findItem(itemId);
        if (itemDoc && itemDoc.itemType === 'PRODUCT' && itemDoc.trackStock !== false) {
          await catalogRepository.restoreStock(itemId, Math.abs(netDelta));
          adjustmentsMade.push({ id: itemId, delta: netDelta });
        }
      }
    }

    // 2. Finalize line items and recalculate discounts
    const finalized = [];
    for (const line of lines) {
      const item = await catalogRepository.findItem(line.itemId);
      if (!item) throw new Error('Item could not be found.');
      const quantity = Math.max(1, Number(line.quantity || 1));
      const unitPrice = Number(line.unitPrice !== undefined ? line.unitPrice : item.price || 0);
      const lineBase = unitPrice * quantity;
      const discountType: 'FLAT' | 'PERCENT' = line.discountType === 'PERCENT' ? 'PERCENT' : 'FLAT';
      const discountVal = Math.max(0, Number(line.discountValue !== undefined ? line.discountValue : (line.discountAmount || 0)));
      const discountAmount = discountType === 'PERCENT'
        ? Math.min(lineBase, (lineBase * discountVal) / 100)
        : Math.min(lineBase, discountVal);
      const totalPrice = Math.max(0, lineBase - discountAmount);

      finalized.push({
        item: item._id,
        quantity,
        unitPrice,
        discountType,
        discountValue: discountVal,
        discountAmount,
        totalPrice,
      });
    }

    const subtotal = finalized.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const itemDiscountTotal = finalized.reduce((sum, line) => sum + line.discountAmount, 0);
    const taxableAfterItemDisc = Math.max(0, subtotal - itemDiscountTotal);

    const billDiscountType: 'FLAT' | 'PERCENT' = req.body.billDiscountType === 'PERCENT' ? 'PERCENT' : 'FLAT';
    const billDiscountVal = Math.max(0, Number(req.body.billDiscountValue !== undefined ? req.body.billDiscountValue : (req.body.totalDiscount || 0)));
    const billDiscountAmount = billDiscountType === 'PERCENT'
      ? Math.min(taxableAfterItemDisc, (taxableAfterItemDisc * billDiscountVal) / 100)
      : Math.min(taxableAfterItemDisc, billDiscountVal);

    const totalDiscount = itemDiscountTotal + billDiscountAmount;
    const grandTotal = Math.max(0, Math.round(subtotal - totalDiscount));

    const updates: any = {
      items: finalized,
      subtotal,
      itemDiscountTotal,
      billDiscountType,
      billDiscountValue: billDiscountVal,
      billDiscountAmount,
      totalDiscount,
      grandTotal,
    };

    if (req.body.customerName !== undefined) updates.customerName = req.body.customerName?.trim();
    if (req.body.customerMobile !== undefined) updates.customerMobile = req.body.customerMobile?.trim();
    if (req.body.paymentMethod !== undefined) updates.paymentMethod = req.body.paymentMethod;
    if (req.body.notes !== undefined) updates.notes = req.body.notes?.trim();

    const updatedSale = await catalogRepository.updateSale(req.params.id, updates);
    return sendSuccess(res, 'Bill updated successfully.', formatSale(updatedSale));
  } catch (error: any) {
    return sendError(res, error.message || 'Could not update bill.', 400);
  }
};

export const cancelSale = async (req: Request, res: Response) => {
  try {
    const sale = await catalogRepository.findSale(req.params.id);
    if (!sale) return sendError(res, 'Bill not found.', 404);
    if (sale.status === 'CANCELLED') {
      return sendError(res, 'Bill is already cancelled/voided.', 400);
    }

    // Restore stock for all products on this bill
    for (const line of sale.items) {
      const rawItem = line.item as any;
      const itemId = rawItem?._id?.toString() || rawItem?.id?.toString() || rawItem?.toString();
      if (itemId && rawItem?.itemType === 'PRODUCT' && rawItem?.trackStock !== false) {
        await catalogRepository.restoreStock(itemId, line.quantity);
      }
    }

    const updated = await catalogRepository.updateSale(req.params.id, {
      status: 'CANCELLED',
      cancelReason: req.body.reason?.trim() || 'Voided by staff',
    });

    return sendSuccess(res, 'Bill cancelled and stock returned.', formatSale(updated));
  } catch (error: any) {
    return sendError(res, error.message || 'Could not cancel bill.', 400);
  }
};

export const getItemHistory = async (req: Request, res: Response) => {
  try {
    const itemId = req.params.id;
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      return sendError(res, 'Valid item ID is required.', 400);
    }

    const objectId = new mongoose.Types.ObjectId(itemId);

    // 1. Direct Sales that include this item
    const sales = await Sale.find({ 'items.item': objectId, status: { $ne: 'CANCELLED' } })
      .populate('soldBy', 'name mobile role')
      .sort({ createdAt: -1 })
      .limit(60);

    const formattedSales = sales.map((sale: any) => {
      const match = (sale.items || []).find((i: any) => i.item?.toString() === itemId);
      return {
        id: sale._id.toString(),
        customerName: sale.customerName || 'Direct Garage Counter',
        customerMobile: sale.customerMobile || '',
        quantity: match ? match.quantity : 1,
        unitPrice: match ? match.unitPrice : 0,
        discountAmount: match ? match.discountAmount : 0,
        totalPrice: match ? match.totalPrice : 0,
        soldBy: sale.soldBy?.name || 'Staff',
        soldByRole: sale.soldBy?.role || 'STAFF',
        createdAt: sale.createdAt,
      };
    });

    // 2. Job Card Tasks that installed or used this item
    const tasks = await Task.find({ inventoryItem: objectId })
      .populate('jobCardId', 'vehicleName vehicleNumber customerName customerMobile status')
      .populate('completedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(60);

    const formattedJobs = tasks.map((task: any) => {
      const jc = task.jobCardId as any;
      return {
        id: task._id.toString(),
        jobCardId: jc?._id ? jc._id.toString() : null,
        vehicleName: jc?.vehicleName || 'Vehicle Service',
        vehicleNumber: jc?.vehicleNumber || 'Unknown Plate',
        customerName: jc?.customerName || '',
        customerMobile: jc?.customerMobile || '',
        jobStatus: jc?.status || 'IN_PROGRESS',
        taskTitle: task.title,
        quantity: task.quantityUsed || 1,
        unitPrice: task.unitPrice || 0,
        discountAmount: task.discountAmount || 0,
        finalPrice: task.finalPrice || (task.unitPrice ? task.unitPrice * (task.quantityUsed || 1) : 0),
        taskStatus: task.status,
        completedBy: task.completedBy?.name || 'Mechanic',
        completedAt: task.completedAt || task.createdAt,
        createdAt: task.createdAt,
      };
    });

    // Aggregated Metrics
    const totalSalesQty = formattedSales.reduce((sum: number, s: any) => sum + s.quantity, 0);
    const totalJobsQty = formattedJobs.reduce((sum: number, j: any) => sum + j.quantity, 0);
    const totalRevenueSales = formattedSales.reduce((sum: number, s: any) => sum + s.totalPrice, 0);
    const totalRevenueJobs = formattedJobs.reduce((sum: number, j: any) => sum + (j.finalPrice || 0), 0);

    return sendSuccess(res, 'Item history retrieved.', {
      sales: formattedSales,
      jobs: formattedJobs,
      summary: {
        totalSoldQty: totalSalesQty + totalJobsQty,
        totalSalesCount: formattedSales.length,
        totalJobsCount: formattedJobs.length,
        totalRevenue: totalRevenueSales + totalRevenueJobs,
        lastUsedAt: formattedSales[0]?.createdAt || formattedJobs[0]?.createdAt || null,
      },
    });
  } catch (error: any) {
    return sendError(res, error.message || 'Could not load item history.', 500);
  }
};

export const adjustItemStock = async (req: Request, res: Response) => {
  try {
    const { delta, newQuantity, reason } = req.body;
    const item = await catalogRepository.findItem(req.params.id);
    if (!item) return sendError(res, 'Item not found.', 404);

    let finalStock = item.stockQuantity || 0;
    if (newQuantity !== undefined && !isNaN(Number(newQuantity))) {
      finalStock = Math.max(0, Number(newQuantity));
    } else if (delta !== undefined && !isNaN(Number(delta))) {
      finalStock = Math.max(0, finalStock + Number(delta));
    }

    const updated = await catalogRepository.updateItem(req.params.id, {
      stockQuantity: finalStock,
    });

    return sendSuccess(res, `Stock adjusted to ${finalStock}.`, {
      item: format(updated),
      finalStock,
      reason: reason || 'Manual adjustment',
      adjustedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return sendError(res, error.message || 'Could not adjust stock.', 400);
  }
};
