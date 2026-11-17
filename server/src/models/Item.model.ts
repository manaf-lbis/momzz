import mongoose, { Document, Schema } from 'mongoose';

export interface IItem extends Document {
  title: string;
  category: mongoose.Types.ObjectId;
  itemType: 'PRODUCT' | 'SERVICE';
  price: number;
  costPrice?: number;
  stockQuantity?: number;
  trackStock: boolean;
  minimumStockQuantity?: number;
  sku?: string;
  brand?: string;
  unit?: string;
  location?: string;
  compatibleVehicles?: string[];
  yearFrom?: number | string;
  yearTo?: number | string;
  thumbnailUrl: string;
  images: string[];
  description?: string;
  isAvailable: boolean;
  isDeleted: boolean;
}

const ItemSchema = new Schema<IItem>({
  title: { type: String, required: true, index: true, trim: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  itemType: { type: String, enum: ['PRODUCT', 'SERVICE'], required: true },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, min: 0, default: 0 },
  stockQuantity: { type: Number, min: 0, default: 0 },
  trackStock: { type: Boolean, default: true },
  minimumStockQuantity: { type: Number, min: 0, default: 0 },
  sku: { type: String, unique: true, sparse: true, trim: true },
  brand: { type: String, trim: true, default: '' },
  unit: { type: String, trim: true, default: 'pcs' },
  location: { type: String, trim: true, default: '' },
  compatibleVehicles: { type: [String], default: [] },
  yearFrom: { type: Schema.Types.Mixed, default: null },
  yearTo: { type: Schema.Types.Mixed, default: null },
  thumbnailUrl: { type: String, default: '' },
  images: { type: [String], default: [] },
  description: { type: String, trim: true, default: '' },
  isAvailable: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

ItemSchema.index({ isDeleted: 1, category: 1, itemType: 1 });


ItemSchema.pre('validate', function (next) {
  if (this.itemType === 'PRODUCT' && (this.stockQuantity === undefined || this.stockQuantity === null)) {
    this.invalidate('stockQuantity', 'Stock quantity is required for products.');
  }
  next();
});

export default mongoose.model<IItem>('Item', ItemSchema);
