import { TaskInventory, ITaskInventory } from '../../models/TaskInventory.model';
import { advancedSearch, findDuplicateCandidates } from '../../shared/utils/search.algorithm';

export class InventoryRepository {
  async search(query: string, limit = 20): Promise<ITaskInventory[]> {
    const trimmed = query?.trim();
    if (!trimmed) {
      return await TaskInventory.find().sort({ name: 1 }).limit(limit);
    }

    // Pre-filter with MongoDB query to prevent full-collection scans in memory
    const escapedQuery = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let candidateItems = await TaskInventory.find({
      $or: [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { category: { $regex: escapedQuery, $options: 'i' } },
      ],
    })
      .sort({ name: 1 })
      .limit(100);

    // If direct regex didn't yield enough, pull a bounded sample for fuzzy matching
    if (candidateItems.length < limit) {
      const extraItems = await TaskInventory.find()
        .sort({ name: 1 })
        .limit(200);
      const seen = new Set(candidateItems.map((c) => c._id.toString()));
      for (const item of extraItems) {
        if (!seen.has(item._id.toString())) {
          candidateItems.push(item);
        }
      }
    }

    const ranked = advancedSearch<ITaskInventory>(
      candidateItems,
      trimmed,
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
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Direct exact match check
    const existingExact = await TaskInventory.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } });
    if (existingExact) return existingExact;

    // Check near duplicates within a bounded candidate set sharing initial characters
    const prefix = escaped.slice(0, 2);
    const candidates = await TaskInventory.find(
      prefix ? { name: { $regex: `^${prefix}`, $options: 'i' } } : {}
    ).limit(100);

    const duplicates = findDuplicateCandidates<ITaskInventory>(
      trimmed,
      candidates,
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
