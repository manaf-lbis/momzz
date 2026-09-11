import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskInventory extends Document {
  name: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskInventorySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
  },
  { timestamps: true }
);

export const TaskInventory = mongoose.model<ITaskInventory>('TaskInventory', TaskInventorySchema);
export default TaskInventory;
