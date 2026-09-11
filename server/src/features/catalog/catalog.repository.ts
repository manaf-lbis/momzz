import Category, { ICategory } from '../../models/Category.model';
import Item, { IItem } from '../../models/Item.model';
import Sale, { ISale } from '../../models/Sale.model';
import { advancedSearch, findDuplicateCandidates } from '../../shared/utils/search.algorithm';

export class CatalogRepository {
  async getCategories(): Promise<ICategory[]> {
    const categories = await Category.find().sort({ name: 1 });
    if (categories.length) return categories;
    return [await Category.create({ name: 'General', type: 'BOTH', description: 'General garage catalog items' })];
  }

  async createCategory(data: Pick<ICategory, 'name' | 'description' | 'type'>) {
    return Category.create(data);
  }

  async getItems(filters: { q?: string; itemType?: string; category?: string }) {
    const query: any = { isDeleted: { $ne: true } };
    if (filters.itemType) query.itemType = filters.itemType;
    if (filters.category) query.category = filters.category;

    const items = await Item.find(query).populate('category', 'name type').sort({ createdAt: -1 });

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
    return Item.create(data);
  }

  async updateItem(id: string, data: Partial<IItem>) {
    return Item.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).populate('category', 'name type');
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
}

export const catalogRepository = new CatalogRepository();
