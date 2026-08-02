import { TaskInventory, ITaskInventory } from '../model/TaskInventory';

export class InventoryRepository {
  async search(query: string, limit = 10): Promise<ITaskInventory[]> {
    return await TaskInventory.find({
      name: { $regex: query, $options: 'i' },
    })
      .sort({ name: 1 })
      .limit(limit);
  }

  async findAll(limit = 100): Promise<ITaskInventory[]> {
    return await TaskInventory.find().sort({ name: 1 }).limit(limit);
  }

  async upsertByName(name: string, category?: string): Promise<ITaskInventory> {
    const existing = await TaskInventory.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) return existing;
    return await TaskInventory.create({ name: name.trim(), category: category || 'General' });
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await TaskInventory.findByIdAndDelete(id);
    return !!result;
  }
}

export const inventoryRepository = new InventoryRepository();
