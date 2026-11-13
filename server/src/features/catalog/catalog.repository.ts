import Category, { ICategory } from '../../models/Category.model';
import Item, { IItem } from '../../models/Item.model';
import Sale, { ISale } from '../../models/Sale.model';
import { advancedSearch, findDuplicateCandidates } from '../../shared/utils/search.algorithm';
import { extractPublicId } from '../../shared/utils/cloudinary.helper';

const sanitizePublicId = (input?: string): string => {
  if (!input || typeof input !== 'string') return '';
  return extractPublicId(input.trim());
};

export class CatalogRepository {
  async getCategories(): Promise<ICategory[]> {
    const categories = await Category.find().sort({ name: 1 });
    if (categories.length) return categories;
    return [await Category.create({ name: 'General', type: 'BOTH', description: 'General garage catalog items' })];
  }

  async createCategory(data: Pick<ICategory, 'name' | 'description' | 'type'>) {
    return Category.create(data);
  }

  async getItems(filters: { q?: string; itemType?: string; category?: string; limit?: number }) {
    const query: any = { isDeleted: { $ne: true } };
    if (filters.itemType) query.itemType = filters.itemType;
    if (filters.category) query.category = filters.category;

    let itemQuery = Item.find(query).populate('category', 'name type').sort({ createdAt: -1 });
    if (!filters.q && filters.limit && filters.limit > 0) {
      itemQuery = itemQuery.limit(Math.min(filters.limit, 100));
    }
    const items = await itemQuery;

    if (!filters.q || !filters.q.trim()) {
      return items;
    }

    // Apply advanced typo-tolerant, space-insensitive fuzzy search
    return advancedSearch<IItem>(
      items,
      filters.q,
      {
        getTitle: (item) => item.title,
        getSku: (item) => item.sku,
        getCategory: (item) => (item.category as any)?.name,
        getDescription: (item) => item.description,
      },
      180 // Threshold for high quality matches
    );
  }

  async getPaginatedItems(filters: {
    q?: string;
    itemType?: string;
    category?: string;
    stockFilter?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(Math.max(1, filters.limit || 20), 100);
    const skip = (page - 1) * limit;

    const query: any = { isDeleted: { $ne: true } };
    const andConditions: any[] = [];

    if (filters.itemType && ['PRODUCT', 'SERVICE'].includes(filters.itemType)) {
      query.itemType = filters.itemType;
    }

    if (filters.category && filters.category !== 'ALL') {
      query.category = filters.category;
    }

    if (filters.stockFilter) {
      const sf = filters.stockFilter.toUpperCase();
      if (sf === 'PRODUCT' || sf === 'SERVICE') {
        query.itemType = sf;
      } else if (sf === 'LOW_STOCK') {
        query.itemType = 'PRODUCT';
        query.trackStock = { $ne: false };
        andConditions.push({
          $expr: {
            $lte: [
              { $ifNull: ['$stockQuantity', 0] },
              { $ifNull: ['$minimumStockQuantity', 0] },
            ],
          },
        });
      }
    }

    if (filters.q && filters.q.trim()) {
      const tokens = filters.q
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 6);

      for (const token of tokens) {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        const matchingCategories = await Category.find({ name: regex }).select('_id').lean();
        const catIds = matchingCategories.map((c) => c._id);

        andConditions.push({
          $or: [
            { title: regex },
            { sku: regex },
            { description: regex },
            ...(catIds.length ? [{ category: { $in: catIds } }] : []),
          ],
        });
      }
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const sort: Record<string, 1 | -1> =
      filters.stockFilter?.toUpperCase() === 'LOW_STOCK'
        ? { stockQuantity: 1, createdAt: -1 }
        : { createdAt: -1 };

    const [items, total] = await Promise.all([
      Item.find(query)
        .populate('category', 'name type')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Item.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const hasMore = skip + items.length < total;

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore,
      },
    };
  }

  async getCatalogStats() {
    const baseQuery = { isDeleted: { $ne: true } };
    const [totalCount, productCount, serviceCount, lowStockCount] = await Promise.all([
      Item.countDocuments(baseQuery),
      Item.countDocuments({ ...baseQuery, itemType: 'PRODUCT' }),
      Item.countDocuments({ ...baseQuery, itemType: 'SERVICE' }),
      Item.countDocuments({
        ...baseQuery,
        itemType: 'PRODUCT',
        trackStock: { $ne: false },
        $expr: {
          $lte: [
            { $ifNull: ['$stockQuantity', 0] },
            { $ifNull: ['$minimumStockQuantity', 0] },
          ],
        },
      }),
    ]);

    return { totalCount, productCount, serviceCount, lowStockCount };
  }

  async findItem(id: string) {
    return Item.findById(id).populate('category', 'name type');
  }

  async findNearDuplicate(title: string): Promise<IItem | null> {
    const allItems = await Item.find({ isDeleted: { $ne: true } }).populate('category', 'name type');
    const duplicates = findDuplicateCandidates<IItem>(
      title,
      allItems,
      (item) => item.title,
      0.88 // 88% similarity threshold for near duplicate detection
    );
    return duplicates.length > 0 ? duplicates[0].item : null;
  }

  async createItem(data: Partial<IItem>) {
    const payload: Partial<IItem> = { ...data };
    if (payload.thumbnailUrl !== undefined) {
      payload.thumbnailUrl = sanitizePublicId(payload.thumbnailUrl);
    }
    if (Array.isArray(payload.images)) {
      payload.images = payload.images.map(sanitizePublicId).filter(Boolean);
      if (!payload.thumbnailUrl && payload.images.length > 0) {
        payload.thumbnailUrl = payload.images[0];
      }
    }
    return Item.create(payload);
  }

  async updateItem(id: string, data: Partial<IItem>) {
    const updates: Partial<IItem> = { ...data };
    if (updates.thumbnailUrl !== undefined) {
      updates.thumbnailUrl = sanitizePublicId(updates.thumbnailUrl);
    }
    if (Array.isArray(updates.images)) {
      updates.images = updates.images.map(sanitizePublicId).filter(Boolean);
      if (!updates.thumbnailUrl && updates.images.length > 0) {
        updates.thumbnailUrl = updates.images[0];
      }
    }
    return Item.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).populate('category', 'name type');
  }

  async deleteItem(id: string) {
    return Item.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } }, { $set: { isDeleted: true, isAvailable: false } }, { new: true });
  }

  async deductStock(itemId: string, quantity: number) {
    return Item.findOneAndUpdate(
      { _id: itemId, itemType: 'PRODUCT', trackStock: { $ne: false }, stockQuantity: { $gte: quantity } },
      { $inc: { stockQuantity: -quantity } },
      { new: true }
    );
  }

  async restoreStock(itemId: string, quantity: number) {
    return Item.findOneAndUpdate(
      { _id: itemId, itemType: 'PRODUCT', trackStock: { $ne: false } },
      { $inc: { stockQuantity: quantity } },
      { new: true }
    );
  }

  async createSale(data: Partial<ISale>) {
    return Sale.create(data);
  }

  async findSale(id: string) {
    return Sale.findById(id)
      .populate({
        path: 'items.item',
        select: 'title sku price category unit thumbnailUrl images itemType trackStock stockQuantity',
        populate: { path: 'category', select: 'name type' },
      })
      .populate('soldBy', 'name mobile role');
  }

  async getSales(filters: { q?: string; status?: string; limit?: number }) {
    const query: any = {};
    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }
    if (filters.q && filters.q.trim()) {
      const regex = new RegExp(filters.q.trim(), 'i');
      query.$or = [
        { invoiceNumber: regex },
        { customerName: regex },
        { customerMobile: regex },
      ];
    }
    const limit = Math.min(filters.limit || 100, 200);
    return Sale.find(query)
      .populate({
        path: 'items.item',
        select: 'title sku price category unit thumbnailUrl images itemType trackStock stockQuantity',
        populate: { path: 'category', select: 'name type' },
      })
      .populate('soldBy', 'name mobile role')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async getPaginatedSales(filters: { q?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(Math.max(1, filters.limit || 20), 100);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }
    if (filters.q && filters.q.trim()) {
      const escaped = filters.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { invoiceNumber: regex },
        { customerName: regex },
        { customerMobile: regex },
      ];
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const activeSalesMatch = { ...query, status: { $ne: 'CANCELLED' } };

    const [sales, total, metricsAgg, todayAgg] = await Promise.all([
      Sale.find(query)
        .populate({
          path: 'items.item',
          select: 'title sku price category unit thumbnailUrl images itemType trackStock stockQuantity',
          populate: { path: 'category', select: 'name type' },
        })
        .populate('soldBy', 'name mobile role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Sale.countDocuments(query),
      Sale.aggregate([
        { $match: activeSalesMatch },
        {
          $group: {
            _id: null,
            totalSalesCount: { $sum: 1 },
            totalRevenue: { $sum: { $ifNull: ['$grandTotal', 0] } },
            totalDiscounts: { $sum: { $ifNull: ['$totalDiscount', 0] } },
          },
        },
      ]),
      Sale.aggregate([
        { $match: { ...activeSalesMatch, createdAt: { $gte: startOfToday } } },
        {
          $group: {
            _id: null,
            todaySalesCount: { $sum: 1 },
            todayRevenue: { $sum: { $ifNull: ['$grandTotal', 0] } },
          },
        },
      ]),
    ]);

    const agg = metricsAgg[0] || { totalSalesCount: 0, totalRevenue: 0, totalDiscounts: 0 };
    const tAgg = todayAgg[0] || { todaySalesCount: 0, todayRevenue: 0 };
    const avgBillValue = agg.totalSalesCount > 0 ? Math.round(agg.totalRevenue / agg.totalSalesCount) : 0;

    return {
      sales,
      metrics: {
        totalSalesCount: agg.totalSalesCount,
        totalRevenue: agg.totalRevenue,
        todaySalesCount: tAgg.todaySalesCount,
        todayRevenue: tAgg.todayRevenue,
        totalDiscounts: agg.totalDiscounts,
        avgBillValue,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: skip + sales.length < total,
      },
    };
  }

  async updateSale(id: string, data: Partial<ISale>) {
    return Sale.findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate({
        path: 'items.item',
        select: 'title sku price category unit thumbnailUrl images itemType trackStock stockQuantity',
        populate: { path: 'category', select: 'name type' },
      })
      .populate('soldBy', 'name mobile role');
  }
}

export const catalogRepository = new CatalogRepository();
