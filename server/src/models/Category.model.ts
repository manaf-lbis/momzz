import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
  type: 'PRODUCT' | 'SERVICE' | 'BOTH';
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true, unique: true, index: true, trim: true },
  description: { type: String, trim: true, default: '' },
  type: { type: String, enum: ['PRODUCT', 'SERVICE', 'BOTH'], default: 'BOTH' },
}, { timestamps: true });

export default mongoose.model<ICategory>('Category', CategorySchema);
