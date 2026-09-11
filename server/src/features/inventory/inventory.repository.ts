import { TaskInventory, ITaskInventory } from '../../models/TaskInventory.model';
import { advancedSearch, findDuplicateCandidates } from '../../shared/utils/search.algorithm';

export class InventoryRepository {
  async search(query: string, limit = 20): Promise<ITaskInventory[]> {
    if (!query || !query.trim()) {
      return await TaskInventory.find().sort({ name: 1 }).limit(limit);
    }

    const allItems = await TaskInventory.find().sort({ name: 1 });
    const ranked = advancedSearch<ITaskInventory>(
      allItems,
      query,
      {
        getTitle: (item) => item.name,
        getCategory: (item) => item.category,
      },
      180
    );

    return ranked.slice(0, limit);
  }

  async findAll(limit = 100): Promise<ITaskInventory[]> {
    return await TaskInventory.find().sort({ name: 1 }).limit(limit);
  }

  async upsertByName(name: string, category?: string): Promise<ITaskInventory> {
    const trimmed = name.trim();
    // Direct exact match check
    const existingExact = await TaskInventory.findOne({ name: { $regex: `^${trimmed}$`, $options: 'i' } });
    if (existingExact) return existingExact;

    // Check near duplicates to avoid small spelling/spacing duplicates
    const all = await TaskInventory.find();
    const duplicates = findDuplicateCandidates<ITaskInventory>(
      trimmed,
      all,
      (item) => item.name,
      0.90 // 90% match for automatic duplicate reuse
    );

    if (duplicates.length > 0) {
      return duplicates[0].item;
    }

    return await TaskInventory.create({ name: trimmed, category: category || 'General' });
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await TaskInventory.findByIdAndDelete(id);
    return !!result;
  }
}

export const inventoryRepository = new InventoryRepository();
