import Category, { ICategory } from '../model/Category';
import Item, { IItem } from '../model/Item';
import Sale, { ISale } from '../model/Sale';

export class CatalogRepository {
  async getCategories(): Promise<ICategory[]> {
    const categories = await Category.find().sort({ name: 1 });
    if (categories.length) return categories;
    return [await Category.create({ name: 'General', type: 'BOTH', description: 'General garage catalog items' })];
  }
  async createCategory(data: Pick<ICategory, 'name' | 'description' | 'type'>) { return Category.create(data); }
  async getItems(filters: { q?: string; itemType?: string; category?: string }) {
    const query: any = { isDeleted: { $ne: true } };
    if (filters.q) query.title = { $regex: filters.q, $options: 'i' };
    if (filters.itemType) query.itemType = filters.itemType;
    if (filters.category) query.category = filters.category;
    return Item.find(query).populate('category', 'name type').sort({ createdAt: -1 });
  }
  async findItem(id: string) { return Item.findById(id).populate('category', 'name type'); }
  async createItem(data: Partial<IItem>) { return Item.create(data); }
  async updateItem(id: string, data: Partial<IItem>) { return Item.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).populate('category', 'name type'); }
  async deleteItem(id: string) { return Item.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } }, { $set: { isDeleted: true, isAvailable: false } }, { new: true }); }
  async deductStock(itemId: string, quantity: number) { return Item.findOneAndUpdate({ _id: itemId, itemType: 'PRODUCT', trackStock: { $ne: false }, stockQuantity: { $gte: quantity } }, { $inc: { stockQuantity: -quantity } }, { new: true }); }
  async restoreStock(itemId: string, quantity: number) { return Item.findOneAndUpdate({ _id: itemId, itemType: 'PRODUCT', trackStock: { $ne: false } }, { $inc: { stockQuantity: quantity } }, { new: true }); }
  async createSale(data: Partial<ISale>) { return Sale.create(data); }
}
export const catalogRepository = new CatalogRepository();
